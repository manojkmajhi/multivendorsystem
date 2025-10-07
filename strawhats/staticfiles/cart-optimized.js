// Optimized cart functionality with faster animations and better UX
;(function() {
  'use strict';

  // Optimized cart operations
  const CartOptimized = {
    // Cache DOM elements
    elements: {},
    // Client-side cart cache for instant updates
    cartCache: null,
    
    // Initialize cart optimization
    init() {
      this.cacheElements();
      this.bindEvents();
      this.optimizeAnimations();
      this.updateCartCount();
    },

    // Cache frequently used DOM elements
    cacheElements() {
      this.elements = {
        triggerButton: document.getElementById('triggerButton'),
        cartCount: document.getElementById('cart-count'),
        floatingCart: document.querySelector('.floating-cart-notification'),
        cartTable: document.getElementById('floating-cart-table'),
        miniCartItems: document.getElementById('mini-cart-items') || document.getElementById('single-stickers-div'),
        nothingInCart: document.getElementById('nothing-in-cart'),
        singleH5: document.getElementById('single-h5'),
        packH5: document.getElementById('pack-h5'),
        showNotShow: document.getElementById('show-notshow')
      };
    },

    // Update cart count on init
    updateCartCount() {
      this.updateCartCountOptimized();
    },

    // Bind optimized event handlers
    bindEvents() {
      // Optimized cart trigger
      if (this.elements.triggerButton) {
        this.elements.triggerButton.addEventListener('click', (e) => {
          this.loadCartOptimized();
        });
      }

      // Optimized remove from cart (event delegation)
      document.addEventListener('click', (e) => {
        if (e.target.closest('.remove-from-cart')) {
          e.preventDefault();
          const button = e.target.closest('.remove-from-cart');
          const productId = button.dataset.productId;
          this.removeFromCartOptimized(productId);
        }
      });
    },

    // Add CSS optimizations for cart animations
    optimizeAnimations() {
      const style = document.createElement('style');
      style.textContent = `
        .cart-item-enter {
          animation: cartItemEnter 0.3s ease-out;
        }
        
        .cart-item-exit {
          animation: cartItemExit 0.2s ease-in;
        }
        
        .cart-count-update {
          animation: cartCountPulse 0.4s ease-out;
        }
        
        @keyframes cartItemEnter {
          from {
            opacity: 0;
            transform: translateX(20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
        }
        
        @keyframes cartItemExit {
          from {
            opacity: 1;
            transform: scale(1);
          }
          to {
            opacity: 0;
            transform: scale(0.9);
          }
        }
        
        @keyframes cartCountPulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.2); }
          100% { transform: scale(1); }
        }
        
        .floating-cart-optimized {
          will-change: transform;
          transform: translateZ(0);
        }
        
        .cart-loading {
          position: relative;
        }
        
        .cart-loading::after {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          width: 20px;
          height: 20px;
          margin: -10px 0 0 -10px;
          border: 2px solid #f3f3f3;
          border-top: 2px solid #333;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `;
      document.head.appendChild(style);
    },

    // Optimized add to cart with immediate feedback
    addToCartOptimized(productId, qty = 1, showCart = false) {
      // Immediate UI update
      this.showAddingState(productId);
      
      // Update cache immediately
      if (this.cartCache) {
        const existing = this.cartCache.cart.find(item => item[0] === productId);
        if (existing) {
          existing[2] += parseInt(qty);
        }
      }
      
      // Show success immediately
      setTimeout(() => this.showAddedState(productId), 100);
      
      // Update count immediately (optimistic)
      const currentCount = this.getCurrentCartCount();
      this.updateCartDisplay(currentCount + parseInt(qty));
      
      if (showCart && this.elements.triggerButton) {
        setTimeout(() => this.elements.triggerButton.click(), 150);
      }
      
      // Background sync with server
      fetch(`/add_to_cart/?productid=${productId}&qty=${qty}`, {
        method: 'GET',
        headers: { 'X-Requested-With': 'XMLHttpRequest' },
        credentials: 'same-origin'
      })
      .then(response => response.json())
      .then(data => {
        this.cartCache = null; // Invalidate cache
        this.updateCartDisplay(data.count);
      })
      .catch(error => {
        console.error('Add to cart error:', error);
        this.cartCache = null;
        this.updateCartCountOptimized();
      });
      
      return Promise.resolve({ ok: true });
    },

    // Optimized remove from cart
    removeFromCartOptimized(productId) {
      const button = document.querySelector(`[data-product-id="${productId}"]`);
      const element = button ? button.closest('.cart-item, .col-3, tr') : null;
      
      // Immediate UI update
      if (element) {
        element.classList.add('cart-item-exit');
        setTimeout(() => element.remove(), 200);
      }
      
      // Update cache immediately
      if (this.cartCache) {
        this.cartCache.cart = this.cartCache.cart.filter(item => item[0] !== productId);
        setTimeout(() => this.renderCartOptimized(this.cartCache), 200);
      }
      
      // Update count immediately
      const currentCount = this.getCurrentCartCount();
      this.updateCartDisplay(Math.max(0, currentCount - 1));
      
      // Background sync
      fetch(`/remove_from_cart/?productid=${productId}`, {
        method: 'GET',
        headers: { 'X-Requested-With': 'XMLHttpRequest' },
        credentials: 'same-origin'
      })
      .then(() => {
        this.cartCache = null;
        this.updateCartCountOptimized();
      })
      .catch(error => {
        console.error('Remove error:', error);
        this.cartCache = null;
        this.loadCartOptimized();
      });
      
      return Promise.resolve();
    },

    // Optimized cart loading with caching
    loadCartOptimized() {
      // Use cache if available for instant display
      if (this.cartCache) {
        this.renderCartOptimized(this.cartCache);
      }
      
      // Fetch fresh data in background
      fetch('/get_cart/', {
        method: 'GET',
        headers: { 'X-Requested-With': 'XMLHttpRequest' },
        credentials: 'same-origin'
      })
      .then(response => response.json())
      .then(data => {
        this.cartCache = data;
        this.renderCartOptimized(data);
      })
      .catch(error => console.error('Load cart error:', error));
      
      return Promise.resolve();
    },

    // Optimized cart rendering with animations
    renderCartOptimized(data) {
      if (!data.cart || data.cart.length === 0) {
        this.renderEmptyCart();
        return;
      }

      // Clear existing content
      if (this.elements.cartTable) this.elements.cartTable.innerHTML = '';
      if (this.elements.miniCartItems) this.elements.miniCartItems.innerHTML = '';
      if (this.elements.nothingInCart) this.elements.nothingInCart.style.display = 'none';

      let total = 0;
      let single = 0;
      let pack = 0;

      // Create document fragment for better performance
      const tableFragment = document.createDocumentFragment();
      const gridFragment = document.createDocumentFragment();

      data.cart.forEach((item, index) => {
        const [id, name, qty, price, image, type] = item;
        
        if (type === "Sticker Pack") {
          pack += qty;
          total += qty * 8;
          
          const row = this.createPackRow(item);
          row.style.animationDelay = `${index * 0.05}s`;
          tableFragment.appendChild(row);
        } else {
          single += qty;
          total += qty;
          
          const gridItem = this.createGridItem(item);
          gridItem.style.animationDelay = `${index * 0.05}s`;
          gridFragment.appendChild(gridItem);
        }
      });

      // Append fragments
      if (this.elements.cartTable) this.elements.cartTable.appendChild(tableFragment);
      if (this.elements.miniCartItems) this.elements.miniCartItems.appendChild(gridFragment);

      // Update counters
      this.updateCounters(single, pack);
    },

    // Create optimized pack row element
    createPackRow(item) {
      const [id, name, qty, price, image] = item;
      const row = document.createElement('tr');
      row.className = 'cart-item-enter';
      row.style.cssText = 'background-color: #fff; border-bottom: 5px solid #f4f5f9;';
      
      row.innerHTML = `
        <td class="px-1 py-1 border-0" scope="row">
          <div class="media align-items-center">
            <img src="${image}" width="60" loading="lazy" alt="${name}"/>
            <div class="media-body ml-1" style="line-height: 14px;">
              <small>${name}<br>
                <span class="px-1 small text-uppercase" style="color:#fff; background-color: #28a745;">${qty} PACK</span>
              </small>
            </div>
          </div>
        </td>
        <td class="border-0 px-1 text-center" style="vertical-align:middle;">
          <small>${qty}</small>
        </td>
        <td class="align-middle border-0">
          <p class="mb-0 ml-0 small">Rs.${qty * price}</p>
        </td>
        <td class="border-0 text-center" style="vertical-align:middle;">
          <button class="btn btn-sm btn-link text-danger p-0 remove-from-cart" data-product-id="${id}" title="Remove">
            <i class="fas fa-times"></i>
          </button>
        </td>
      `;
      
      return row;
    },

    // Create optimized grid item element
    createGridItem(item) {
      const [id, name, qty, price, image] = item;
      const div = document.createElement('div');
      div.className = 'col-3 px-1 py-1 position-relative cart-item-enter';
      
      const qtyBadge = qty > 1 ? 
        `<div class="small px-1 py-0" style="position: absolute; right: 0.4rem; top: 0.4rem; background-color: #000; color:#fff; border-radius:3px; z-index: 2;">${qty}</div>` : '';
      
      div.innerHTML = `
        ${qtyBadge}
        <button class="btn btn-sm btn-link text-danger p-0 remove-from-cart position-absolute" 
                data-product-id="${id}" 
                style="left: 0.2rem; top: 0.2rem; z-index: 2;" 
                title="Remove">
          <i class="fas fa-times-circle"></i>
        </button>
        <img src="${image}" class="border" style="width:100%;" loading="lazy" alt="${name}"/>
      `;
      
      return div;
    },

    // Render empty cart state
    renderEmptyCart() {
      if (this.elements.nothingInCart) {
        this.elements.nothingInCart.style.display = 'block';
        this.elements.nothingInCart.innerHTML = '<strong class="h5 text-uppercase">Cart is Empty</strong>';
      }
      
      if (this.elements.cartTable) this.elements.cartTable.innerHTML = '';
      if (this.elements.miniCartItems) this.elements.miniCartItems.innerHTML = '';
      
      this.updateCounters(0, 0);
    },

    // Update counter displays
    updateCounters(single, pack) {
      if (this.elements.singleH5) {
        this.elements.singleH5.innerHTML = single > 0 ? `${single} Item${single > 1 ? 's' : ''}` : '';
      }
      
      if (this.elements.packH5) {
        this.elements.packH5.innerHTML = pack > 0 ? `${pack} Items (Pack)` : '';
      }
      
      if (this.elements.showNotShow) {
        this.elements.showNotShow.style.display = (single > 0 && pack > 0) ? 'block' : 'none';
      }
    },

    // Optimized cart count update with animation
    updateCartCountOptimized(count) {
      if (count !== undefined) {
        this.updateCartDisplay(count);
        return;
      }

      fetch('/get_cart/', {
        method: 'GET',
        headers: { 'X-Requested-With': 'XMLHttpRequest' },
        credentials: 'same-origin'
      })
      .then(response => response.json())
      .then(data => {
        const totalQty = data.cart ? data.cart.reduce((sum, item) => sum + item[2], 0) : 0;
        this.updateCartDisplay(totalQty);
      })
      .catch(error => console.error('Update cart count error:', error));
    },

    // Update cart display elements
    updateCartDisplay(count) {
      if (this.elements.cartCount) {
        if (count > 0) {
          this.elements.cartCount.textContent = count;
          this.elements.cartCount.style.display = 'inline-block';
          this.elements.cartCount.classList.add('cart-count-update');
          
          setTimeout(() => {
            this.elements.cartCount.classList.remove('cart-count-update');
          }, 400);
        } else {
          this.elements.cartCount.style.display = 'none';
        }
      }

      if (this.elements.floatingCart) {
        this.elements.floatingCart.style.display = count > 0 ? 'block' : 'none';
      }
    },

    // Show adding state with immediate feedback
    showAddingState(productId) {
      try {
        const message = document.querySelector(`[class*="${CSS.escape(productId)}-added-message"]`);
        if (message) {
          message.textContent = 'Adding...';
          message.style.display = 'block';
          message.classList.add('cart-item-enter');
        }
      } catch(e) {
        console.log('No message element for', productId);
      }
    },

    // Show added state
    showAddedState(productId) {
      try {
        const message = document.querySelector(`[class*="${CSS.escape(productId)}-added-message"]`);
        if (message) {
          message.textContent = 'Added!';
          setTimeout(() => {
            message.style.display = 'none';
            message.classList.remove('cart-item-enter');
          }, 1200);
        }
      } catch(e) {
        console.log('No message element for', productId);
      }
    },

    // Show error state
    showErrorState(productId) {
      try {
        const message = document.querySelector(`[class*="${CSS.escape(productId)}-added-message"]`);
        if (message) {
          message.textContent = 'Error';
          message.style.backgroundColor = '#dc3545';
          setTimeout(() => {
            message.style.display = 'none';
            message.style.backgroundColor = '';
            message.classList.remove('cart-item-enter');
          }, 2000);
        }
      } catch(e) {
        console.log('Error showing error state for', productId);
      }
    },

    // Optimized cart arrow display
    showCartArrowOptimized() {
      if (document.cookie.indexOf('cart_shown=') >= 0) return;
      
      const arrow = document.querySelector('.floating-cart-arrow');
      if (arrow) {
        arrow.style.display = 'block';
        arrow.classList.add('cart-item-enter');
        
        setTimeout(() => {
          arrow.style.display = 'none';
          arrow.classList.remove('cart-item-enter');
        }, 1500);
      }
      
      document.cookie = 'cart_shown=seen;path=/';
    },

    // Get or create device ID
    getOrCreateDevice() {
      let device = this.getCookie('device');
      if (!device) {
        device = this.generateUUID();
        document.cookie = `device=${device};path=/`;
      }
      return device;
    },

    // Get cookie value
    getCookie(name) {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop().split(';').shift();
      return null;
    },

    // Generate UUID
    generateUUID() {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    },

    // Get current cart count from cache or DOM
    getCurrentCartCount() {
      if (this.cartCache && this.cartCache.cart) {
        return this.cartCache.cart.reduce((sum, item) => sum + item[2], 0);
      }
      const countEl = this.elements.cartCount;
      return countEl ? parseInt(countEl.textContent) || 0 : 0;
    }
  };

  // Override global functions with optimized versions
  window.addToCart = function(productId, qty, showCart) {
    return CartOptimized.addToCartOptimized(productId, qty, showCart);
  };

  window.updateCartCount = function() {
    return CartOptimized.updateCartCountOptimized();
  };

  window.loadCart = function() {
    return CartOptimized.loadCartOptimized();
  };

  window.removeFromCart = function(productId) {
    return CartOptimized.removeFromCartOptimized(productId);
  };

  // Close button function for floating cart
  window.closeButton = function() {
    const triggerButton = document.getElementById('triggerButton');
    if (triggerButton) {
      triggerButton.checked = false;
    }
  };

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => CartOptimized.init());
  } else {
    CartOptimized.init();
  }

})();