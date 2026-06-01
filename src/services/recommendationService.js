const { getDatabase } = require('../config/database');

/**
 * Fetch all active products
 */
async function getActiveProducts() {
  const supabase = getDatabase();
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('active', true);
    
    if (error) {
      console.warn('⚠️ Supabase error fetching active products:', error.message);
      return [];
    }
    return data || [];
  } catch (e) {
    console.error('💥 Exception fetching products:', e.message);
    return [];
  }
}

/**
 * Get product by ID helper
 */
async function getProductById(id) {
  const supabase = getDatabase();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from('products')
      .select('*, seller:seller_id(full_name, business_name, profile_image)')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.warn('⚠️ Supabase product lookup error:', error.message);
      return null;
    }
    return data;
  } catch (e) {
    console.error('💥 Exception looking up product by ID:', e.message);
    return null;
  }
}

/**
 * 1. Frequently Bought Together (Co-occurrence mining + cascading fallback)
 */
async function getFrequentlyBoughtTogether(productId, limit = 3) {
  const supabase = getDatabase();
  const seedProduct = await getProductById(productId);
  if (!seedProduct) return [];

  let recommended = [];

  if (supabase) {
    try {
      // Find orders containing the seed product
      const { data: orders, error } = await supabase
        .from('orders')
        .select('items')
        .contains('items', [{ productId: productId }]);

      if (!error && orders && orders.length > 0) {
        const freqMap = {};
        orders.forEach(order => {
          const items = Array.isArray(order.items) ? order.items : [];
          items.forEach(item => {
            if (item.productId && item.productId !== productId) {
              freqMap[item.productId] = (freqMap[item.productId] || 0) + 1;
            }
          });
        });

        const sortedIds = Object.keys(freqMap).sort((a, b) => freqMap[b] - freqMap[a]);
        if (sortedIds.length > 0) {
          const topIds = sortedIds.slice(0, limit);
          const { data: productsData } = await supabase
            .from('products')
            .select('*')
            .in('id', topIds)
            .eq('active', true);
          
          if (productsData) {
            recommended = productsData;
          }
        }
      }
    } catch (e) {
      console.error('Error fetching frequently bought together:', e.message);
    }
  }

  // --- Fallback Cascade Layer 1: Same Seller & Same Category ---
  if (recommended.length < limit && seedProduct.seller_id && supabase) {
    try {
      const { data: sellerProducts } = await supabase
        .from('products')
        .select('*')
        .eq('seller_id', seedProduct.seller_id)
        .eq('category', seedProduct.category)
        .eq('active', true)
        .neq('id', productId)
        .limit(limit - recommended.length);

      if (sellerProducts && sellerProducts.length > 0) {
        recommended = [...recommended, ...sellerProducts];
      }
    } catch (e) {
      console.error('Error fetching seller products fallback:', e.message);
    }
  }

  // --- Fallback Cascade Layer 2: Same Category (recency) ---
  if (recommended.length < limit) {
    const all = await getActiveProducts();
    const sameCat = all
      .filter(p => p.category === seedProduct.category && p.id !== productId && !recommended.some(r => r.id === p.id))
      .slice(0, limit - recommended.length);
    
    recommended = [...recommended, ...sameCat];
  }

  // --- Fallback Cascade Layer 3: Site Popular / General fallbacks ---
  if (recommended.length < limit) {
    const all = await getActiveProducts();
    const general = all
      .filter(p => p.id !== productId && !recommended.some(r => r.id === p.id))
      .slice(0, limit - recommended.length);
    
    recommended = [...recommended, ...general];
  }

  return recommended.slice(0, limit);
}

/**
 * 2. Personalized Picks (Browsing History based)
 */
async function getPersonalizedRecommendations(viewedProductIds = [], limit = 6) {
  const allProducts = await getActiveProducts();
  let recommended = [];

  // Deduplicate and filter out any empty IDs
  const cleanViewedIds = [...new Set(viewedProductIds.filter(Boolean))];

  if (cleanViewedIds.length > 0) {
    // Gather recently viewed products
    const viewedProducts = allProducts.filter(p => cleanViewedIds.includes(p.id));
    const viewedCategories = [...new Set(viewedProducts.map(p => p.category).filter(Boolean))];

    if (viewedCategories.length > 0) {
      // Recommend products in the categories user has browsed, prioritizing popular items
      const categoryPicks = allProducts.filter(p => 
        viewedCategories.includes(p.category) && 
        !cleanViewedIds.includes(p.id)
      );

      // Sort by popularity flag if it exists, otherwise randomize or sort by ID
      categoryPicks.sort((a, b) => {
        if (a.is_popular && !b.is_popular) return -1;
        if (!a.is_popular && b.is_popular) return 1;
        return 0;
      });

      recommended = categoryPicks.slice(0, limit);
    }
  }

  // --- Fallback Cascade: Site Popular or Latest items ---
  if (recommended.length < limit) {
    const popularPicks = allProducts.filter(p => 
      p.is_popular && 
      !cleanViewedIds.includes(p.id) && 
      !recommended.some(r => r.id === p.id)
    );

    recommended = [...recommended, ...popularPicks];
  }

  // Double fallback: if still not enough, add any active product
  if (recommended.length < limit) {
    const defaultPicks = allProducts.filter(p => 
      !cleanViewedIds.includes(p.id) && 
      !recommended.some(r => r.id === p.id)
    );
    recommended = [...recommended, ...defaultPicks];
  }

  // Triple fallback: if still not enough (e.g. user has viewed all products in a small catalog),
  // allow returning already viewed products as a last resort instead of showing an empty section!
  if (recommended.length < limit) {
    const viewedFallbackPicks = allProducts.filter(p => 
      !recommended.some(r => r.id === p.id)
    );
    recommended = [...recommended, ...viewedFallbackPicks];
  }

  // Only output recommendations from actual active database products

  return recommended.slice(0, limit);
}

/**
 * 3. Cart Cross-Sells (Frequently Bought With...)
 */
async function getCartCrossSells(cartProductIds = [], limit = 6) {
  const allProducts = await getActiveProducts();
  const cleanCartIds = [...new Set(cartProductIds.filter(Boolean))];
  
  if (cleanCartIds.length === 0) {
    // If cart is empty, suggest popular items
    return allProducts.filter(p => p.is_popular).slice(0, limit);
  }

  let recommended = [];
  const supabase = getDatabase();

  // Try to mine order history for items bought with any cart item
  if (supabase) {
    try {
      // Find orders containing any of the cart products
      const query = supabase
        .from('orders')
        .select('items')
        .limit(100);
      
      const { data: orders } = await query;
      
      if (orders && orders.length > 0) {
        const freqMap = {};
        orders.forEach(order => {
          const items = Array.isArray(order.items) ? order.items : [];
          const hasCartItem = items.some(item => cleanCartIds.includes(item.productId));
          
          if (hasCartItem) {
            items.forEach(item => {
              if (item.productId && !cleanCartIds.includes(item.productId)) {
                freqMap[item.productId] = (freqMap[item.productId] || 0) + 1;
              }
            });
          }
        });

        const sortedIds = Object.keys(freqMap).sort((a, b) => freqMap[b] - freqMap[a]);
        if (sortedIds.length > 0) {
          const topIds = sortedIds.slice(0, limit);
          const { data: productsData } = await supabase
            .from('products')
            .select('*')
            .in('id', topIds)
            .eq('active', true);

          if (productsData) recommended = productsData;
        }
      }
    } catch (e) {
      console.error('Error fetching cart cross-sells:', e.message);
    }
  }

  // --- Fallback Cascade 1: Same category as cart items ---
  if (recommended.length < limit) {
    const cartProducts = allProducts.filter(p => cleanCartIds.includes(p.id));
    const cartCategories = [...new Set(cartProducts.map(p => p.category).filter(Boolean))];

    if (cartCategories.length > 0) {
      const sameCatPicks = allProducts.filter(p => 
        cartCategories.includes(p.category) && 
        !cleanCartIds.includes(p.id) &&
        !recommended.some(r => r.id === p.id)
      );
      recommended = [...recommended, ...sameCatPicks];
    }
  }

  // --- Fallback Cascade 2: Popular Items ---
  if (recommended.length < limit) {
    const popularPicks = allProducts.filter(p => 
      p.is_popular && 
      !cleanCartIds.includes(p.id) && 
      !recommended.some(r => r.id === p.id)
    );
    recommended = [...recommended, ...popularPicks];
  }

  // Double fallback
  if (recommended.length < limit) {
    const fallbackPicks = allProducts.filter(p => 
      !cleanCartIds.includes(p.id) && 
      !recommended.some(r => r.id === p.id)
    );
    recommended = [...recommended, ...fallbackPicks];
  }

  return recommended.slice(0, limit);
}

module.exports = {
  getFrequentlyBoughtTogether,
  getPersonalizedRecommendations,
  getCartCrossSells
};
