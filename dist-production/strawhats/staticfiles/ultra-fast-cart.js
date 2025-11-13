// Ultra-Fast Cart System with Instant Feedback
;(function() {
  'use strict';

  const FastCart = {
    cache: null,
    pendingOps: [],
    
    init() {
      this.setupOptimisticUI();
      this.prefetchCart();
      this.setupEventDelegation();
    },

    setupOptimisticUI() {
      const style = document.createElement('style');
      style.textContent = `
        .cart-adding { opacity: 0.6; pointer-events: none; }
        .cart-success { animation: successPulse 0.4s ease; }
        @keyframes successPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
        .cart-item-removing { 
          animation: slideOut 0.3s ease forwards;
          pointer-events: none;
        }
        @keyframes slideOut {
          to { 
            opacity: 0; 
            transform: translateX(-20px) scale(0.9);
            height: 0;
            margin: 0;
            padding: 0;
          }
        }
      `;
      document.head.appendChild(style);
    },

    prefetchCart() {
      if ('requestIdleCallback' in window) {
        requestIdleCallback(() => this.loadCartData(), { timeout: 1000 });
      } else {
        setTimeout(() => this.loadCartData(), 500);
      }
    },

    loadCartData() {
      fetch('/get_cart/', {
        method: 'GET',
        headers: { 'X-Requested-With': 'XMLHttpRequest' },
        credentials: 'same-origin'
      })
      .then(r => r.json())
      .then(data => {
        this.cache = data;
        this.updateCountFromCache();
      })
      .catch(() => {});
    },

    updateCountFromCache() {
      if (!this.cache || !this.cache.cart) return;
      const count = this.cache.cart.reduce((sum, item) => sum + item[2], 0);
      const countEl = document.getElementById('cart-count');
      if (countEl && count > 0) {
        countEl.textContent = count;
        countEl.style.display = 'inline-block';
      }
    },

    setupEventDelegation() {
      // Only handle remove buttons - add to cart handled by existing system
      document.addEventListener('click', (e) => {
        const removeBtn = e.target.closest('.remove-from-cart');
        if (removeBtn) {
          e.preventDefault();
          this.handleRemoveFromCart(removeBtn);
        }
      });
    },



    handleRemoveFromCart(btn) {
      const productId = btn.dataset.productId;
      const variantId = btn.dataset.variantId || null;
      
      const item = btn.closest('.cart-item, .col-3, tr');
      if (item) {
        item.classList.add('cart-item-removing');
        setTimeout(() => item.remove(), 300);
      }

      const currentCount = this.getCurrentCount();
      this.updateCount(Math.max(0, currentCount - 1));

      this.removeFromCartAPI(productId, variantId);
    },



    removeFromCartAPI(productId, variantId) {
      const url = `/remove_from_cart/?productid=${productId}${variantId ? `&variantid=${variantId}` : ''}`;
      
      fetch(url, {
        method: 'GET',
        headers: { 'X-Requested-With': 'XMLHttpRequest' },
        credentials: 'same-origin'
      })
      .then(() => {
        this.cache = null;
        if (window.updateCartCount) window.updateCartCount();
      })
      .catch(() => {
        this.cache = null;
        if (window.loadCart) window.loadCart();
      });
    },

    getCurrentCount() {
      const countEl = document.getElementById('cart-count');
      return countEl ? parseInt(countEl.textContent) || 0 : 0;
    },

    updateCount(count) {
      const countEl = document.getElementById('cart-count');
      if (countEl) {
        if (count > 0) {
          countEl.textContent = count;
          countEl.style.display = 'inline-block';
          countEl.classList.add('cart-success');
          setTimeout(() => countEl.classList.remove('cart-success'), 400);
        } else {
          countEl.style.display = 'none';
        }
      }

      const floatingCart = document.querySelector('.floating-cart-notification');
      if (floatingCart) {
        floatingCart.style.display = count > 0 ? 'block' : 'none';
      }
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => FastCart.init());
  } else {
    FastCart.init();
  }

  window.FastCart = FastCart;

})();
