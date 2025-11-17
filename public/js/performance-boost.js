// Ultra-Fast Performance Boost System
;(function() {
  'use strict';

  const PerformanceBoost = {
    // In-memory cache for instant responses
    cache: {
      products: new Map(),
      cart: null,
      cartTimestamp: 0,
      categories: null
    },

    // Initialize all performance optimizations
    init() {
      this.setupResourceHints();
      this.optimizeNetworkRequests();
      this.setupServiceWorker();
      this.prefetchCriticalData();
      this.optimizeScrolling();
      this.setupIdleTaskScheduler();
    },

    // Add resource hints for faster loading
    setupResourceHints() {
      const hints = [
        { rel: 'dns-prefetch', href: '//maxcdn.bootstrapcdn.com' },
        { rel: 'dns-prefetch', href: '//cdnjs.cloudflare.com' },
        { rel: 'dns-prefetch', href: '//ajax.googleapis.com' },
        { rel: 'preconnect', href: '//maxcdn.bootstrapcdn.com', crossorigin: true },
        { rel: 'preconnect', href: '//cdnjs.cloudflare.com', crossorigin: true }
      ];

      hints.forEach(hint => {
        const link = document.createElement('link');
        Object.keys(hint).forEach(key => link.setAttribute(key, hint[key]));
        document.head.appendChild(link);
      });
    },

    // Optimize network requests with batching and debouncing
    optimizeNetworkRequests() {
      // Batch multiple cart operations
      this.cartOperationQueue = [];
      this.cartOperationTimer = null;

      // Debounced cart sync
      this.syncCartDebounced = this.debounce(() => {
        if (this.cartOperationQueue.length > 0) {
          this.processBatchedCartOperations();
        }
      }, 300);
    },

    // Setup service worker for offline support and caching
    setupServiceWorker() {
      if ('serviceWorker' in navigator && location.protocol === 'https:') {
        navigator.serviceWorker.register('/sw.js').catch(() => {
          console.log('Service worker registration skipped');
        });
      }
    },

    // Prefetch critical data on idle
    prefetchCriticalData() {
      if ('requestIdleCallback' in window) {
        requestIdleCallback(() => {
          this.prefetchCart();
          this.prefetchCategories();
        }, { timeout: 2000 });
      } else {
        setTimeout(() => {
          this.prefetchCart();
          this.prefetchCategories();
        }, 1000);
      }
    },

    // Prefetch cart data
    prefetchCart() {
      fetch('/get_cart/', {
        method: 'GET',
        headers: { 'X-Requested-With': 'XMLHttpRequest' },
        credentials: 'same-origin'
      })
      .then(r => r.json())
      .then(data => {
        this.cache.cart = data;
        this.cache.cartTimestamp = Date.now();
      })
      .catch(() => {});
    },

    // Prefetch categories
    prefetchCategories() {
      // Categories are already in DOM, extract and cache
      const categories = Array.from(document.querySelectorAll('.category-item')).map(el => ({
        name: el.querySelector('.category-item-title')?.textContent,
        href: el.getAttribute('href'),
        image: el.querySelector('img')?.src
      }));
      this.cache.categories = categories;
    },

    // Optimize scrolling performance
    optimizeScrolling() {
      let ticking = false;
      const onScroll = () => {
        if (!ticking) {
          requestAnimationFrame(() => {
            this.handleScroll();
            ticking = false;
          });
          ticking = true;
        }
      };

      window.addEventListener('scroll', onScroll, { passive: true });
    },

    // Handle scroll events efficiently
    handleScroll() {
      // Lazy load images in viewport
      const images = document.querySelectorAll('img[data-src]:not([data-loaded])');
      images.forEach(img => {
        if (this.isInViewport(img, 200)) {
          this.loadImage(img);
        }
      });
    },

    // Check if element is in viewport
    isInViewport(el, margin = 0) {
      const rect = el.getBoundingClientRect();
      return (
        rect.top < window.innerHeight + margin &&
        rect.bottom > -margin &&
        rect.left < window.innerWidth + margin &&
        rect.right > -margin
      );
    },

    // Load image with optimization
    loadImage(img) {
      const src = img.dataset.src;
      if (!src) return;

      img.dataset.loaded = 'true';
      const tempImg = new Image();
      tempImg.onload = () => {
        img.src = src;
        img.removeAttribute('data-src');
        img.classList.add('loaded');
      };
      tempImg.src = src;
    },

    // Setup idle task scheduler
    setupIdleTaskScheduler() {
      this.idleTasks = [];
      
      const processIdleTasks = (deadline) => {
        while (deadline.timeRemaining() > 0 && this.idleTasks.length > 0) {
          const task = this.idleTasks.shift();
          task();
        }
        
        if (this.idleTasks.length > 0) {
          requestIdleCallback(processIdleTasks);
        }
      };

      if ('requestIdleCallback' in window) {
        requestIdleCallback(processIdleTasks);
      }
    },

    // Add task to idle queue
    scheduleIdleTask(task) {
      this.idleTasks.push(task);
      if ('requestIdleCallback' in window) {
        requestIdleCallback(() => {
          if (this.idleTasks.length > 0) {
            const t = this.idleTasks.shift();
            t();
          }
        });
      }
    },

    // Debounce utility
    debounce(func, wait) {
      let timeout;
      return function executedFunction(...args) {
        const later = () => {
          clearTimeout(timeout);
          func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
      };
    },

    // Process batched cart operations
    processBatchedCartOperations() {
      const operations = [...this.cartOperationQueue];
      this.cartOperationQueue = [];

      // Send all operations in one request
      Promise.all(operations.map(op => op())).then(() => {
        this.cache.cart = null; // Invalidate cache
        if (window.updateCartCount) window.updateCartCount();
      });
    }
  };

  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => PerformanceBoost.init());
  } else {
    PerformanceBoost.init();
  }

  window.PerformanceBoost = PerformanceBoost;

})();
