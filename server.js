const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 3000;

// Supabase client (service role if performing admin ops server-side)
let supabase = null;
if (process.env.SUPABASE_URL && (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY)) {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  supabase = createClient(process.env.SUPABASE_URL, key, {
    auth: { persistSession: false }
  });
  console.log('✓ Supabase client initialized', { 
    url: process.env.SUPABASE_URL, 
    keyType: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'service_role' : 'anon' 
  });
} else {
  console.warn('Supabase environment variables not set. Admin features disabled until configured.');
}

// Settings helpers (uses 'settings' table: key text primary key, value jsonb, updated_at timestamptz default now())
async function getSetting(key, fallback = null){
  if(!supabase) return fallback;
  const { data, error } = await supabase.from('settings').select('value').eq('key', key).single();
  if(error) return fallback;
  return data.value;
}
async function setSetting(key, value){
  if(!supabase) return false;
  const { error } = await supabase.from('settings').upsert({ key, value });
  if(error){ console.error('Failed to set setting', key, error); return false; }
  return true;
}

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use((req,res,next)=>{
  res.locals.title = 'Stickers Nepal';
  next();
});

// -------- Site Setting Injection (for dynamic logo/name in admin UI) --------
let siteCache = { value: null, fetchedAt: 0 };
async function loadSiteSetting(force=false){
  if(!supabase) return { name: 'Stickers Nepal', logo_url: '/staticfiles/brand.svg' };
  if(!force && siteCache.value && Date.now() - siteCache.fetchedAt < 60_000){
    return siteCache.value;
  }
  try {
    const site = await getSetting('site', { name: 'Stickers Nepal', logo_url: '/staticfiles/brand.svg' });
    siteCache = { value: site, fetchedAt: Date.now() };
    return site;
  } catch(e){
    return { name: 'Stickers Nepal', logo_url: '/staticfiles/brand.svg' };
  }
}
app.use(async (req,res,next)=>{
  res.locals.siteSetting = await loadSiteSetting();
  next();
});

// In-memory storage (per process). In production use a DB or persistent store.
const carts = {}; // key: device id, value: array of cart line items

// In-memory fallback product catalog (used only if Supabase unavailable). Real data comes from DB.
const products = [
  { id: '455', name: 'Avengers Logo', price: 45, image: '/media/455_Avengers%20Logo.jpg', type: 'Sticker', category: 'Marvel-Studios', active: true },
  { id: '516', name: 'God of Beer', price: 45, image: '/media/516_God%20of%20Beer.jpg', type: 'Sticker', category: 'Marvel-Studios', active: true },
  { id: '722', name: 'In case of fire', price: 45, image: '/media/722_In%20case%20of%20fire%26git%2C%20github%2C%20gitlab%2C%20commit%2C%20push.jpg', type: 'Sticker', category: 'Profession', active: true },
  { id: '739', name: 'React', price: 45, image: '/media/739_React%26frontend%2C%20mern%20stack%2C%20react%20native.jpg', type: 'Sticker', category: 'Profession', active: true },
  { id: '485', name: 'Casette', price: 45, image: '/media/485_Casette%26starlord%2C%20awesome%20mix%20vol%201.jpg', type: 'Sticker', category: 'Music', active: true },
  { id: '165', name: 'Mugiwara Pirates', price: 45, image: '/media/165_Mugiwara%20Pirates%26straw%20hat%2C%20pirates%2C%20pirate%20logo%2C.jpg', type: 'Sticker', category: 'Anime', active: true },
  { id: '730', name: 'Middle Finger', price: 45, image: '/media/730_Middle%20Finger%26sql%2C%20codes%2C%20program.jpg', type: 'Sticker', category: 'Others', active: true },
  { id: '245', name: 'Spongebob License', price: 45, image: '/media/245_Spongebob%20License%26driving%20school.jpg', type: 'Sticker', category: 'Cartoon', active: true },
  { id: '701', name: 'Chrome Dinasour', price: 45, image: '/media/701_Chrome%20Dinasour%26no%20internet%2C%20google%20chrome%2C%20cactus.jpg', type: 'Sticker', category: 'Games', active: true },
  { id: '735', name: 'Programmer', price: 45, image: '/media/735_Programmer%26developer%2C%20coder.jpg', type: 'Sticker', category: 'Profession', active: true },
  { id: '464', name: 'The Scar', price: 45, image: '/media/464_The%20Scar.jpg', type: 'Sticker', category: 'Movies', active: true },
  { id: '12', name: 'Levi Fuck You', price: 45, image: '/media/12_Levi%20Fuck%20You%26angry%2C.jpg', type: 'Sticker', category: 'Anime', active: true }
];

// Unified product lookup (DB first if configured, then fallback array)
async function getAnyProductById(id){
  if(!id) return null;
  id = String(id).trim();
  console.log('→ getAnyProductById called', { id, hasSupabase: !!supabase });
  
  if(supabase){
    try {
      // Direct query by id (UUID primary key) - service role bypasses RLS
      const { data, error } = await supabase.from('products').select('*').eq('id', id).maybeSingle();
      
      if(error){
        console.error('❌ SUPABASE_PRODUCT_LOOKUP_ERROR', { id, error: error.message, code: error.code, details: error.details, hint: error.hint });
      } else if(data) {
        console.log('✓ SUPABASE_PRODUCT_LOOKUP_SUCCESS', { id, name: data.name, active: data.active });
        return data;
      } else {
        console.warn('⚠ SUPABASE_PRODUCT_LOOKUP_EMPTY', { id, message: 'Query succeeded but returned no data (likely RLS block or product does not exist)' });
      }

    } catch(e){ 
      console.error('💥 SUPABASE_PRODUCT_LOOKUP_EXCEPTION', { id, error: e.message, stack: e.stack }); 
    }
  }
  
  // Fallback to in-memory products
  const memMatch = products.find(p=>p.id === id);
  if(memMatch) {
    console.log('✓ Found in memory fallback', { id });
    return memMatch;
  }
  
  console.warn('❌ Product not found anywhere', { id });
  return null;
}

// --- Data access helpers (DB first, fallback to in-memory) ---
async function dbFetchProducts(filter = {}) {
  if(!supabase) {
    let list = products.filter(p=>p.active!==false);
    if(filter.category) list = list.filter(p=> (p.category||'').toLowerCase() === filter.category.toLowerCase());
    if(filter.id) list = list.filter(p=> p.id === filter.id);
    return list;
  }
  let query = supabase.from('products').select('*').eq('active', true);
  if(filter.category && filter.category.toLowerCase() !== 'all') {
    query = query.eq('category', filter.category);
  }
  if(filter.id) {
    query = query.eq('id', filter.id);
  }
  if(filter.orderLatest) query = query.order('created_at', { ascending:false });
  if(filter.limit) query = query.limit(filter.limit);
  const { data, error } = await query;
  if(error) { console.error('DB_PRODUCTS_ERROR', error); return []; }
  return data || [];
}

async function dbFetchProductById(id){
  const list = await dbFetchProducts({ id });
  return list[0] || null;
}

// Categories fallback list (if DB not configured). Real list is dynamic from categories table.
const fallbackCategories = [
  { name: 'Sports', image: '/staticfiles/Sports.jpg' },
  { name: 'Animals', image: '/staticfiles/Animals.jpg' },
  { name: 'Movies', image: '' },
  { name: 'Profession', image: '' },
  { name: 'Anime', image: '' },
  { name: 'Cartoon', image: '/staticfiles/Cartoon.jpg' },
  { name: 'Automobile', image: '/staticfiles/Automobile.jpg' },
  { name: 'Games', image: '/staticfiles/Games.jpg' },
  { name: 'Marvel-Studios', image: '/staticfiles/Marvel-Studios.jpg' }
];

let categoriesCache = { data: null, fetchedAt: 0 };
async function dbFetchCategories(force=false){
  if(!supabase) return fallbackCategories;
  if(!force && categoriesCache.data && (Date.now()-categoriesCache.fetchedAt)<30_000){
    return categoriesCache.data;
  }
  const { data, error } = await supabase.from('categories').select('*').order('created_at');
  if(error){ console.error('DB_CATEGORIES_ERROR', error); return fallbackCategories; }
  // Normalize to ensure .image always exists for templates
  const normalized = (data||[]).map(c=> ({ ...c, image: c.image_url || c.image || '' }));
  categoriesCache = { data: normalized, fetchedAt: Date.now() };
  return normalized;
}

// View engine
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Serve static frontend (index.html) and assets
app.use('/media', express.static(path.join(__dirname, 'stickersnepal.com', 'media')));
app.use('/staticfiles', express.static(path.join(__dirname, 'stickersnepal.com', 'staticfiles')));
// NOTE: root static serving moved to bottom (after dynamic routes) to avoid swallowing /details/:id/ etc.

// -------- Admin Auth (very light placeholder) --------
// For now use a simple header token or query param; later integrate Supabase auth.
let cachedAdminHash = null;
async function getAdminHash(){
  if(!supabase) return null;
  if(cachedAdminHash) return cachedAdminHash;
  const { data, error } = await supabase.from('settings').select('value').eq('key','admin_auth').single();
  if(!error && data && data.value && data.value.password_hash){
    cachedAdminHash = data.value.password_hash;
    return cachedAdminHash;
  }
  return null;
}
async function adminGuard(req,res,next){
  const sessionToken = req.cookies.admin_session;
  const hash = await getAdminHash();
  // If no password has been set yet, allow fallback dev token
  if(!hash){
    const token = req.headers['x-admin-token'] || req.query.admin_token || req.cookies.admin_token;
    const expected = process.env.ADMIN_TOKEN || 'dev-admin';
    if(token === expected) return next();
  }
  // We store the exact hash value in the cookie after login; just compare directly
  if(sessionToken && hash && sessionToken === hash){
    return next();
  }
  return res.redirect('/admin/login?next=' + encodeURIComponent(req.originalUrl));
}

// -------- Admin Routes (CRUD skeleton) --------
app.get('/admin/', adminGuard, async (req,res)=>{
  try {
    let stats = { products: products.length, categories: fallbackCategories.length };
    if (supabase) {
      const [{ count: pCount }, { count: cCount }] = await Promise.all([
        supabase.from('products').select('*', { count: 'exact', head: true }),
        supabase.from('categories').select('*', { count: 'exact', head: true })
      ]);
      stats = { products: pCount || 0, categories: cCount || 0 };
    }
  res.render('admin/dashboard', { stats, siteSetting: res.locals.siteSetting });
  } catch (e) {
    console.error(e);
    res.status(500).render('simple-message', { title: 'Error', message: 'Failed to load dashboard.' });
  }
});

// ---- Admin Auth UI ----
app.get('/admin/login', async (req,res)=>{
  const hash = await getAdminHash();
  if(req.cookies.admin_session && hash && req.cookies.admin_session === hash){
    return res.redirect(req.query.next || '/admin/');
  }
  res.render('admin/login', { next: req.query.next || '/admin/', siteSetting: res.locals.siteSetting });
});

app.post('/admin/login', async (req,res)=>{
  const { password, next } = req.body;
  const hash = await getAdminHash();
  if(hash){
    const ok = await bcrypt.compare(password, hash);
    if(!ok) return res.status(401).render('simple-message', { title: 'Unauthorized', message: 'Invalid password.' });
    // Store the hash itself as session token (since we already treat possession as auth). Do NOT store plain password.
    res.cookie('admin_session', hash, { httpOnly: true, sameSite: 'lax', maxAge: 7*24*3600*1000 });
    return res.redirect(next || '/admin/');
  }
  const expected = process.env.ADMIN_TOKEN || 'dev-admin';
  if(password === expected){
    res.cookie('admin_token', expected, { httpOnly: true, sameSite: 'lax', maxAge: 7*24*3600*1000 });
    return res.redirect(next || '/admin/');
  }
  res.status(401).render('simple-message', { title: 'Unauthorized', message: 'Invalid password.' });
});

app.post('/admin/logout', (req,res)=>{
  res.clearCookie('admin_session');
  res.clearCookie('admin_token');
  res.redirect('/admin/login');
});

app.get('/admin/products', adminGuard, async (req,res)=>{
  try {
    let list = products; // fallback in-memory
    if (supabase) {
      const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending:false }).limit(200);
      if (!error && data) list = data;
    }
  res.render('admin/products', { items: list, msg: req.query.msg || '', siteSetting: res.locals.siteSetting });
  } catch(e){
    console.error(e);
    res.status(500).render('simple-message', { title: 'Error', message: 'Failed to load products.' });
  }
});

app.get('/admin/products/new', adminGuard, async (req,res)=>{
  const categories = await dbFetchCategories();
  res.render('admin/product-form', { item: null, categories, siteSetting: res.locals.siteSetting });
});

app.post('/admin/products/new', adminGuard, async (req,res)=>{
  const { name, price, category, type, image } = req.body;
  try {
    if (supabase) {
      const { error } = await supabase.from('products').insert({ name, price: parseFloat(price), category, type, image });
      if (error) throw error;
    } else {
      products.push({ id: String(Date.now()), name, price: parseFloat(price), category, type, image });
    }
    res.redirect('/admin/products?msg=' + encodeURIComponent('Product created'));
  } catch (e) {
    console.error(e);
    res.status(500).render('simple-message', { title: 'Error', message: 'Failed to create product.' });
  }
});

// Edit product
app.get('/admin/products/:id/edit', adminGuard, async (req,res)=>{
  const id = req.params.id;
  try {
    let item = await dbFetchProductById(id);
    const categories = await dbFetchCategories();
    if(!item) return res.status(404).render('simple-message', { title: 'Not Found', message: 'Product not found.' });
  res.render('admin/product-form', { item, categories, siteSetting: res.locals.siteSetting });
  } catch(e){
    console.error(e);
    res.status(500).render('simple-message', { title: 'Error', message: 'Failed to load product.' });
  }
});

app.post('/admin/products/:id/edit', adminGuard, async (req,res)=>{
  const id = req.params.id;
  const { name, price, category, type, image } = req.body;
  try {
    if (supabase) {
      const { error } = await supabase.from('products').update({ name, price: parseFloat(price), category, type, image }).eq('id', id);
      if(error) throw error;
    } else {
      const idx = products.findIndex(p=>p.id === id);
      if(idx === -1) return res.status(404).render('simple-message', { title: 'Not Found', message:'Product missing.' });
      products[idx] = { ...products[idx], name, price: parseFloat(price), category, type, image };
    }
    res.redirect('/admin/products?msg=' + encodeURIComponent('Product updated'));
  } catch(e){
    console.error(e);
    res.status(500).render('simple-message', { title:'Error', message:'Failed to update product.' });
  }
});

// Delete product
app.post('/admin/products/:id/delete', adminGuard, async (req,res)=>{
  const id = req.params.id;
  try {
    if (supabase) {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if(error) throw error;
    } else {
      const idx = products.findIndex(p=>p.id === id);
      if(idx !== -1) products.splice(idx,1);
    }
    res.redirect('/admin/products?msg=' + encodeURIComponent('Product deleted'));
  } catch(e){
    console.error(e);
    res.status(500).render('simple-message', { title:'Error', message:'Failed to delete product.' });
  }
});

// Toggle active
app.post('/admin/products/:id/toggle-active', adminGuard, async (req,res)=>{
  const id = req.params.id;
  try {
    if (supabase) {
      const { data, error } = await supabase.from('products').select('active').eq('id', id).single();
      if(error) throw error;
      const { error: upErr } = await supabase.from('products').update({ active: !data.active }).eq('id', id);
      if(upErr) throw upErr;
    } else {
      const item = products.find(p=>p.id===id);
      if(item) item.active = !item.active;
    }
    res.redirect('/admin/products?msg=' + encodeURIComponent('Status updated'));
  } catch(e){
    console.error(e);
    res.status(500).render('simple-message', { title:'Error', message:'Failed to toggle active.' });
  }
});

app.get('/admin/categories', adminGuard, async (req,res)=>{
  try {
    const list = await dbFetchCategories();
    res.render('admin/categories', { items: list, msg: req.query.msg || '', siteSetting: res.locals.siteSetting });
  } catch(e){
    console.error(e);
    res.status(500).render('simple-message', { title: 'Error', message: 'Failed to load categories.' });
  }
});

app.post('/admin/categories/new', adminGuard, async (req,res)=>{
  const { name, image_url } = req.body;
  try {
    if (supabase) {
      const { error } = await supabase.from('categories').insert({ name, image_url });
      if(error) throw error;
      await dbFetchCategories(true);
    } else {
      fallbackCategories.push({ name, image: image_url });
    }
    res.redirect('/admin/categories?msg=' + encodeURIComponent('Category added'));
  } catch(e){
    console.error(e);
    res.status(500).render('simple-message', { title:'Error', message:'Failed to add category.' });
  }
});

app.post('/admin/categories/:id/delete', adminGuard, async (req,res)=>{
  const id = req.params.id; // id or name fallback
  try {
    if (supabase) {
      const { error } = await supabase.from('categories').delete().eq('id', id);
      if(error) throw error;
      await dbFetchCategories(true);
    } else {
      const idx = fallbackCategories.findIndex(c=>c.name===id);
      if(idx!==-1) fallbackCategories.splice(idx,1);
    }
    res.redirect('/admin/categories?msg=' + encodeURIComponent('Category deleted'));
  } catch(e){
    console.error(e);
    res.status(500).render('simple-message', { title:'Error', message:'Failed to delete category.' });
  }
});

// Settings (logo, site name, etc.)
app.get('/admin/settings', adminGuard, async (req,res)=>{
  try {
    const site = await getSetting('site', { name: 'Stickers Nepal', logo_url: '/staticfiles/brand.svg' });
  res.render('admin/settings', { site, msg: req.query.msg || '', siteSetting: res.locals.siteSetting });
  } catch(e){
    console.error(e);
    res.status(500).render('simple-message', { title: 'Error', message: 'Failed to load settings.' });
  }
});

app.post('/admin/settings', adminGuard, async (req,res)=>{
  const { name, logo_url, new_password } = req.body;
  try {
    let siteOk = true;
    const siteResult = await setSetting('site', { name, logo_url });
    if(!siteResult) siteOk = false;
    let pwChanged = false;
    if(new_password && new_password.trim().length){
      if(!supabase){
        return res.status(500).render('simple-message', { title:'Error', message:'Supabase not configured; cannot set password.' });
      }
      if(new_password.trim().length < 6){
        return res.status(400).render('simple-message', { title:'Weak Password', message:'Password must be at least 6 characters.' });
      }
      const password_hash = await bcrypt.hash(new_password.trim(), 10);
      const { error } = await supabase.from('settings').upsert({ key: 'admin_auth', value: { password_hash, updated_at: new Date().toISOString() } });
      if(error) throw error;
      cachedAdminHash = password_hash;
      res.cookie('admin_session', password_hash, { httpOnly:true, sameSite:'lax', maxAge:7*24*3600*1000 });
      pwChanged = true;
    }
    if(!siteOk){
      return res.status(500).render('simple-message', { title:'Partial Error', message:'Password updated but failed to save site settings (RLS or missing service key).' });
    }
    await loadSiteSetting(true); // refresh cache
    const msg = encodeURIComponent('Settings saved' + (pwChanged? ' (password updated)':'') );
    res.redirect('/admin/settings?msg=' + msg);
  } catch(e){
    console.error('SETTINGS_SAVE_ERROR', e);
    let hint = 'Failed to save settings.';
    if(e && e.code === '42501') hint = 'RLS blocked write. Use SUPABASE_SERVICE_ROLE_KEY in .env or adjust policies.';
    res.status(500).render('simple-message', { title: 'Error', message: hint });
  }
});

// ---------- Hero Images CRUD ----------
app.get('/admin/hero-images', adminGuard, async (req,res)=>{
  try {
    let list = [];
    if(supabase){
      const { data, error } = await supabase.from('hero_images').select('*').order('position');
      if(!error && data) list = data;
    }
  res.render('admin/hero-images', { items: list, msg: req.query.msg || '', siteSetting: res.locals.siteSetting });
  } catch(e){
    console.error(e);
    res.status(500).render('simple-message', { title:'Error', message:'Failed to load hero images.' });
  }
});

app.post('/admin/hero-images/new', adminGuard, async (req,res)=>{
  const { title, image_url, link_url, position } = req.body;
  try {
    if(supabase){
      const { error } = await supabase.from('hero_images').insert({ title, image_url, link_url, position: parseInt(position||0,10) });
      if(error) throw error;
    }
    res.redirect('/admin/hero-images?msg=' + encodeURIComponent('Hero image added'));
  } catch(e){
    console.error(e);
    res.status(500).render('simple-message', { title:'Error', message:'Failed to add hero image.' });
  }
});

app.post('/admin/hero-images/:id/delete', adminGuard, async (req,res)=>{
  const id = req.params.id;
  try {
    if(supabase){
      const { error } = await supabase.from('hero_images').delete().eq('id', id);
      if(error) throw error;
    }
    res.redirect('/admin/hero-images?msg=' + encodeURIComponent('Deleted'));
  } catch(e){
    console.error(e);
    res.status(500).render('simple-message', { title:'Error', message:'Failed to delete hero image.' });
  }
});

app.post('/admin/hero-images/:id/toggle-active', adminGuard, async (req,res)=>{
  const id = req.params.id;
  try {
    if(supabase){
      const { data, error } = await supabase.from('hero_images').select('active').eq('id', id).single();
      if(error) throw error;
      const { error: upErr } = await supabase.from('hero_images').update({ active: !data.active }).eq('id', id);
      if(upErr) throw upErr;
    }
    res.redirect('/admin/hero-images?msg=' + encodeURIComponent('Status updated'));
  } catch(e){
    console.error(e);
    res.status(500).render('simple-message', { title:'Error', message:'Failed to update status.' });
  }
});

// Category route matching existing links like /shop/DC-Studios/
app.get('/shop/:category/', async (req, res) => {
  try {
    const catParam = req.params.category;
    const allCategories = await dbFetchCategories();
    const isAll = catParam.toLowerCase() === 'all';
    const catObj = isAll ? { name: 'All', image: '' } : allCategories.find(c => c.name.toLowerCase() === catParam.toLowerCase());
    if (!catObj) {
      return res.status(404).render('simple-message', { title: 'Not Found', message: 'Category not found.' });
    }

    // Fetch products for category
    const catProducts = await dbFetchProducts({ category: catObj.name });

    // Pagination
    const pageSize = 32; // matches original site layout (1-32 of X)
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const totalCount = catProducts.length;
    const totalPages = Math.max(Math.ceil(totalCount / pageSize), 1);
    const safePage = Math.min(page, totalPages);
    const startIdx = (safePage - 1) * pageSize;
    const endIdxExclusive = Math.min(startIdx + pageSize, totalCount);
    const pageProducts = catProducts.slice(startIdx, endIdxExclusive);

    res.render('shop-category', {
      activeCategory: catObj.name,
      categories: allCategories,
      products: pageProducts,
      total: totalCount,
      showingStart: totalCount ? startIdx + 1 : 0,
      showingEnd: endIdxExclusive,
      page: safePage,
      totalPages,
      siteSetting: res.locals.siteSetting
    });
  } catch(e){
    console.error('CATEGORY_PAGE_ERROR', e);
    res.status(500).render('simple-message', { title:'Error', message:'Failed to load category.' });
  }
});

// Product details page
app.get('/details/:id/', async (req,res)=>{
  try {
    const id = req.params.id;
    const product = await dbFetchProductById(id);
    if(!product) return res.status(404).render('simple-message', { title:'Not Found', message:'Product not found.' });
    // Related products: same category (exclude current) limit 6
    let related = await dbFetchProducts({ category: product.category, limit: 12, orderLatest: true });
    related = related.filter(p=>p.id !== product.id).slice(0,6);
    res.render('product-details', { product, related, siteSetting: res.locals.siteSetting });
  } catch(e){
    console.error('DETAILS_PAGE_ERROR', e);
    res.status(500).render('simple-message', { title:'Error', message:'Failed to load product.' });
  }
});

// Well-known route to silence 404 noise from Chrome DevTools request
app.get('/.well-known/appspecific/com.chrome.devtools.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.json({ version: 1, note: 'Placeholder to avoid 404.' });
});

// Helper to get / create a cart bucket
function getCart(device) {
  if (!carts[device]) carts[device] = []; // each item: {productId, qty}
  return carts[device];
}

// Add to cart endpoint (front-end calls /add_to_cart/?productid=..&qty=..)
app.get('/add_to_cart/', async (req, res) => {
  try {
    const { productid, qty } = req.query;
    console.log('🛒 ADD_TO_CART request', { productid, qty, cookies: req.cookies });
    
    if (!productid || !qty) {
      console.warn('❌ Missing params');
      return res.status(400).json({ error: 'productid and qty required' });
    }
    
    const trimmed = String(productid).trim();
    const product = await getAnyProductById(trimmed);
    
    if (!product) {
      console.error('❌ ADD_TO_CART_PRODUCT_NOT_FOUND', { productid: trimmed });
      return res.status(404).json({ error: 'Product not found' });
    }
    
    const device = req.cookies.device || 'anonymous';
    console.log('✓ Product found, adding to cart', { productid: trimmed, device, productName: product.name });
    
    const cart = getCart(device);
    const existing = cart.find(i => i.productId === trimmed);
    if (existing) {
      existing.qty += parseInt(qty, 10);
    } else {
      cart.push({ productId: trimmed, qty: parseInt(qty, 10) });
    }
    
    const totalCount = cart.reduce((a,c)=>a+c.qty,0);
    console.log('✓ Cart updated', { device, itemCount: cart.length, totalQty: totalCount });
    
    return res.json({ ok: true, count: totalCount });
  } catch(e){
    console.error('💥 ADD_TO_CART_ERROR', e);
    return res.status(500).json({ error: 'Failed to add to cart' });
  }
});

// Get cart endpoint (JSON) expected by various front-end scripts
app.get('/get_cart/', async (req,res)=>{
  try {
    const device = req.cookies.device || 'anonymous';
    const cart = getCart(device);
    console.log('📋 GET_CART request', { device, itemCount: cart.length });
    
    // Look up each product properly (including DB)
    const mapped = [];
    for(const it of cart){
      const p = await getAnyProductById(it.productId);
      if(p){
        // Format: [id, name, qty, price, image, type, qty_duplicate]
        mapped.push([p.id, p.name || p.title || 'Item', it.qty, parseFloat(p.price) || 0, p.image || '', p.type || 'Sticker', it.qty]);
        console.log('  ✓ Product loaded', { id: p.id, name: p.name, price: p.price });
      } else {
        console.warn('  ⚠️ Product not found in DB', { productId: it.productId });
        // Return placeholder so cart doesn't break
        mapped.push([it.productId, 'Unknown', it.qty, 0, '', 'Sticker', it.qty]);
      }
    }
    
    console.log('✓ GET_CART response', { mappedCount: mapped.length });
    res.json({ cart: mapped });
  } catch(e){
    console.error('GET_CART_ERROR', e);
    res.status(500).json({ error: 'Failed to load cart' });
  }
});

// Remove from cart endpoint
app.get('/remove_from_cart/', async (req, res) => {
  try {
    const device = req.cookies.device || 'anonymous';
    const productId = req.query.productid;
    
    if (!productId) {
      return res.status(400).json({ error: 'Product ID required' });
    }
    
    const cart = getCart(device);
    const index = cart.findIndex(item => item.productId === productId);
    
    if (index !== -1) {
      cart.splice(index, 1);
      // Cart is modified in place since getCart returns the reference
      console.log('✓ Removed from cart', { device, productId, remainingItems: cart.length });
      res.json({ success: true, message: 'Item removed from cart' });
    } else {
      console.log('⚠️ Item not found in cart', { device, productId });
      res.json({ success: false, message: 'Item not found in cart' });
    }
  } catch(e) {
    console.error('REMOVE_FROM_CART_ERROR', e);
    res.status(500).json({ error: 'Failed to remove item from cart' });
  }
});

// Debug endpoint to list visible product IDs (in-memory + optional DB) for troubleshooting
app.get('/__debug_products', async (req,res)=>{
  const list = [...products];
  if(supabase){
    try { const { data, error } = await supabase.from('products').select('id,name,price,active').limit(200);
      if(!error && data){ data.forEach(d=>{ if(!list.find(p=>p.id===d.id)) list.push(d); }); }
    } catch(e){}
  }
  res.json({ count: list.length, ids: list.map(p=>p.id) });
});

// Single product lookup debug
app.get('/__debug_lookup', async (req,res)=>{
  const id = (req.query.productid||'').trim();
  let product = null, errInfo = null;
  try { product = await getAnyProductById(id); } catch(e){ errInfo = String(e); }
  res.json({ input:id, supabaseConfigured: !!supabase, found: !!product, product, errInfo });
});

// Environment (non-sensitive flags only)
app.get('/__debug_env', (req,res)=>{
  res.json({ supabaseConfigured: !!supabase, hasUrl: !!process.env.SUPABASE_URL, hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY, hasAnon: !!process.env.SUPABASE_ANON_KEY });
});

// Test cart system - manually add a product to verify everything works
app.get('/__test_add_to_cart', async (req,res)=>{
  try {
    const device = req.cookies.device || 'test-device';
    // Use first available product
    let testProductId = '455'; // fallback
    if(supabase){
      const { data } = await supabase.from('products').select('id').limit(1).single();
      if(data) testProductId = data.id;
    }
    
    const product = await getAnyProductById(testProductId);
    if(!product) return res.json({ error: 'No products available to test' });
    
    const cart = getCart(device);
    cart.push({ productId: testProductId, qty: 1 });
    carts[device] = cart;
    
    res.json({ 
      ok: true, 
      message: 'Test product added to cart', 
      device, 
      productId: testProductId, 
      productName: product.name,
      cartSize: cart.length,
      instructions: 'Now visit /get_cart/ or /cart/ to see if data renders correctly'
    });
  } catch(e){
    res.json({ error: e.message });
  }
});

// Dynamic homepage (fully DB-backed)
app.get('/', async (req,res)=>{
  try {
    const [categories, productsList] = await Promise.all([
      dbFetchCategories(),
      dbFetchProducts({ orderLatest:true, limit: 12 })
    ]);
    let heroImages = [];
    if(supabase){
      const { data } = await supabase.from('hero_images').select('*').eq('active', true).order('position');
      heroImages = data || [];
    }
    if(!heroImages.length){
      heroImages = [{ image_url:'/staticfiles/hero-banner.jpg', title: res.locals.siteSetting.name, link_url:'/shop/All/', position:0 }];
    }
    res.render('home', { categories, products: productsList, heroImages, siteSetting: res.locals.siteSetting });
  } catch(e){
    console.error('HOME_RENDER_ERROR', e);
    res.status(500).render('simple-message', { title:'Error', message:'Failed to load homepage.' });
  }
});

// Cart page
app.get('/cart/', async (req,res)=>{
  try {
    const device = req.cookies.device || 'anonymous';
    const cart = getCart(device);
    console.log('🛒 CART_PAGE request', { device, itemCount: cart.length });
    
    // Look up each product properly (including DB)
    const items = [];
    for(const item of cart){
      const p = await getAnyProductById(item.productId);
      if(p){
        items.push({ 
          id: p.id, 
          name: p.name || p.title || 'Item', 
          price: parseFloat(p.price) || 0, 
          image: p.image || '', 
          qty: item.qty, 
          subtotal: (parseFloat(p.price) || 0) * item.qty 
        });
        console.log('  ✓ Cart item', { id: p.id, name: p.name, price: p.price, qty: item.qty });
      } else {
        console.warn('  ⚠️ Product not found', { productId: item.productId });
        items.push({ id: item.productId, name: 'Unknown', price: 0, image: '', qty: item.qty, subtotal: 0 });
      }
    }
    
    const total = items.reduce((s,i)=>s+i.subtotal,0);
    const itemCount = items.reduce((s,i)=>s+i.qty,0);
    console.log('✓ Cart page render', { itemCount, total });
    
    res.render('cart', { items, total, itemCount, siteSetting: res.locals.siteSetting });
  } catch(e){
    console.error('CART_PAGE_ERROR', e);
    res.status(500).render('simple-message', { title: 'Error', message: 'Failed to load cart.' });
  }
});

// Checkout page (collects delivery details) - minimal server render, submit would be implemented later
app.get('/checkout/', async (req, res) => {
  try {
    const device = req.cookies.device || 'anonymous';
    const cart = getCart(device);
    
    // Look up each product properly
    const items = [];
    for(const item of cart){
      const p = await getAnyProductById(item.productId);
      if(p){
        items.push({ 
          id: p.id, 
          name: p.name || p.title || 'Item', 
          price: parseFloat(p.price) || 0, 
          image: p.image || '', 
          qty: item.qty, 
          subtotal: (parseFloat(p.price) || 0) * item.qty 
        });
      }
    }
    
    const total = items.reduce((s,i)=>s+i.subtotal,0);
    if(!items.length) return res.redirect('/cart/');
    res.render('checkout', { items, total, siteSetting: res.locals.siteSetting });
  } catch(e){
    console.error('CHECKOUT_PAGE_ERROR', e);
    res.status(500).render('simple-message', { title: 'Error', message: 'Failed to load checkout.' });
  }
});

// Set cart quantity (allows decreasing / removing)
app.get('/set_cart_qty/', (req, res) => {
  const { productid, qty } = req.query;
  if(!productid || typeof qty === 'undefined') return res.status(400).json({ error:'productid and qty required'});
  const q = parseInt(qty,10);
  const device = req.cookies.device || 'anonymous';
  const cart = getCart(device);
  const entry = cart.find(i=>i.productId===productid);
  if(!entry) return res.status(404).json({ error:'Item not in cart'});
  if(q <= 0){
    const idx = cart.indexOf(entry);
    cart.splice(idx,1);
  } else {
    entry.qty = q;
  }
  return res.json({ ok:true });
});

// Serve remaining static assets
app.use('/', express.static(path.join(__dirname, 'stickersnepal.com'), { index:false }));

function start(port, attempt=0){
  const srv = app.listen(port, () => {
    console.log('='.repeat(60));
    console.log(`✓ Server running on http://localhost:${port}`);
    console.log(`✓ Admin panel: http://localhost:${port}/admin/`);
    console.log(`✓ Debug endpoints:`);
    console.log(`  - http://localhost:${port}/__debug_env`);
    console.log(`  - http://localhost:${port}/__debug_products`);
    console.log(`  - http://localhost:${port}/__debug_lookup?productid=YOUR_ID`);
    console.log('='.repeat(60));
  });
  srv.on('error', (err)=>{
    if(err.code === 'EADDRINUSE' && attempt < 5){
      const next = port + 1;
      console.warn(`Port ${port} in use, trying ${next}...`);
      start(next, attempt+1);
    } else {
      console.error('Failed to start server:', err);
      process.exit(1);
    }
  });
}
start(Number(PORT));
