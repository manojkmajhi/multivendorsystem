// Performance-optimized JavaScript for faster loading and animations
;(function() {
  'use strict';

  // Critical performance optimizations
  const perf = {
    // Image lazy loading with intersection observer
    initLazyImages() {
      const images = document.querySelectorAll('img[data-src], img[loading="lazy"]');
      if (!images.length) return;

      if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver((entries, observer) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              const img = entry.target;
              
              // Preload image before setting src
              const tempImg = new Image();
              tempImg.onload = () => {
                if (img.dataset.src) {
                  img.src = img.dataset.src;
                  img.removeAttribute('data-src');
                }
                img.classList.add('loaded');
                img.style.opacity = '1';
              };
              tempImg.src = img.dataset.src || img.src;
              
              observer.unobserve(img);
            }
          });
        }, {
          rootMargin: '50px 0px',
          threshold: 0.01
        });

        images.forEach(img => {
          img.style.opacity = '0';
          img.style.transition = 'opacity 0.3s ease-in-out';
          imageObserver.observe(img);
        });
      } else {
        // Fallback for older browsers
        images.forEach(img => {
          if (img.dataset.src) {
            img.src = img.dataset.src;
            img.removeAttribute('data-src');
          }
        });
      }
    },

    // Optimize cart animations
    optimizeCartAnimations() {
      const style = document.createElement('style');
      style.textContent = `
        .cart-animation-optimized {
          will-change: transform, opacity;
          transform: translateZ(0);
        }
        
        .fade-in-fast {
          animation: fadeInFast 0.2s ease-out;
        }
        
        .slide-in-cart {
          animation: slideInCart 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
        }
        
        @keyframes fadeInFast {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes slideInCart {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        
        .product-hover-optimized {
          transition: transform 0.2s ease-out, box-shadow 0.2s ease-out;
        }
        
        .product-hover-optimized:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        
        /* Reduce motion for users who prefer it */
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }
      `;
      document.head.appendChild(style);
    },

    // Preload critical resources
    preloadCriticalResources() {
      const criticalImages = [
        '/staticfiles/brand.svg',
        '/staticfiles/hero-banner.jpg'
      ];

      criticalImages.forEach(src => {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = 'image';
        link.href = src;
        document.head.appendChild(link);
      });
    },

    // Optimize search suggestions
    optimizeSearch() {
      let searchTimeout;
      let searchController;
      
      const searchInput = document.getElementById('search');
      if (!searchInput) return;

      const searchSuggestions = document.createElement('div');
      searchSuggestions.className = 'search-suggestions-optimized';
      searchSuggestions.style.cssText = `
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        background: #fff;
        border: 1px solid #ddd;
        border-top: none;
        border-radius: 0 0 8px 8px;
        max-height: 300px;
        overflow-y: auto;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 1000;
        display: none;
        transform: translateZ(0);
      `;

      searchInput.parentElement.style.position = 'relative';
      searchInput.parentElement.appendChild(searchSuggestions);

      searchInput.addEventListener('input', function() {
        const query = this.value.trim();
        
        clearTimeout(searchTimeout);
        if (searchController) searchController.abort();
        
        if (query.length < 2) {
          searchSuggestions.style.display = 'none';
          return;
        }

        searchTimeout = setTimeout(() => {
          searchController = new AbortController();
          
          fetch(`/api/search-suggestions?q=${encodeURIComponent(query)}`, {
            signal: searchController.signal
          })
          .then(response => response.json())
          .then(data => {
            if (data.suggestions && data.suggestions.length) {
              const fragment = document.createDocumentFragment();
              
              data.suggestions.forEach(item => {
                const div = document.createElement('div');
                div.className = 'suggestion-item-optimized';
                div.style.cssText = `
                  display: flex;
                  align-items: center;
                  padding: 8px 12px;
                  cursor: pointer;
                  border-bottom: 1px solid #f0f0f0;
                  transition: background-color 0.15s ease;
                `;
                
                div.innerHTML = `
                  <img src="${item.image}" alt="${item.name}" 
                       style="width: 40px; height: 40px; object-fit: contain; margin-right: 10px; border-radius: 4px;"
                       loading="lazy">
                  <div style="flex: 1;">
                    <div style="font-size: 13px; font-weight: 600; color: #333; margin-bottom: 2px;">${item.name}</div>
                    <div style="font-size: 12px; color: #666;">Rs. ${item.price}</div>
                  </div>
                `;
                
                div.addEventListener('mouseenter', () => {
                  div.style.backgroundColor = '#f8f9fa';
                });
                
                div.addEventListener('mouseleave', () => {
                  div.style.backgroundColor = '';
                });
                
                div.addEventListener('click', () => {
                  window.location.href = `/details/${item.id}/`;
                });
                
                fragment.appendChild(div);
              });
              
              searchSuggestions.innerHTML = '';
              searchSuggestions.appendChild(fragment);
              searchSuggestions.style.display = 'block';
            } else {
              searchSuggestions.innerHTML = '<div style="padding: 15px; text-align: center; color: #999; font-size: 14px;">No products found</div>';
              searchSuggestions.style.display = 'block';
            }
          })
          .catch(err => {
            if (err.name !== 'AbortError') {
              console.error('Search error:', err);
            }
          });
        }, 200); // Reduced debounce time
      });

      // Hide suggestions when clicking outside
      document.addEventListener('click', (e) => {
        if (!e.target.closest('#search') && !e.target.closest('.search-suggestions-optimized')) {
          searchSuggestions.style.display = 'none';
        }
      });
    },

    // Optimize add to cart functionality
    optimizeAddToCart() {
      // Override the global addToCart function for better performance
      window.addToCartOptimized = function(productId, qty, showCart) {
        const device = getCookie('device') || uuidv4();
        document.cookie = `device=${device};path=/`;

        // Show immediate feedback
        const addedMessage = document.querySelector(`.${productId}-added-message`);
        if (addedMessage) {
          addedMessage.textContent = 'Adding...';
          addedMessage.classList.add('fade-in-fast');
          addedMessage.style.display = 'block';
        }

        fetch('/add_to_cart/', {
          method: 'GET',
          headers: {
            'X-Requested-With': 'XMLHttpRequest'
          },
          credentials: 'same-origin'
        })
        .then(response => response.json())
        .then(data => {
          if (addedMessage) {
            addedMessage.textContent = 'Added!';
            setTimeout(() => {
              addedMessage.style.display = 'none';
              addedMessage.classList.remove('fade-in-fast');
            }, 1000);
          }

          // Update cart count with animation
          const cartCount = document.getElementById('cart-count');
          if (cartCount && data.count) {
            cartCount.textContent = data.count;
            cartCount.classList.add('fade-in-fast');
            cartCount.style.display = 'inline-block';
          }

          // Show floating cart if requested
          if (showCart) {
            const triggerButton = document.getElementById('triggerButton');
            if (triggerButton) {
              triggerButton.click();
            }
          }

          // Update cart display
          updateCartCount();
        })
        .catch(error => {
          console.error('Add to cart error:', error);
          if (addedMessage) {
            addedMessage.textContent = 'Error';
            addedMessage.style.display = 'none';
          }
        });
      };
    },

    // Initialize all optimizations
    init() {
      // Run immediately for critical optimizations
      this.preloadCriticalResources();
      this.optimizeCartAnimations();
      
      // Run after DOM is ready
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
          this.initLazyImages();
          this.optimizeSearch();
          this.optimizeAddToCart();
        });
      } else {
        this.initLazyImages();
        this.optimizeSearch();
        this.optimizeAddToCart();
      }
    }
  };

  // Helper functions
  function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
      const cookies = document.cookie.split(';');
      for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i].trim();
        if (cookie.substring(0, name.length + 1) === (name + '=')) {
          cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
          break;
        }
      }
    }
    return cookieValue;
  }

  function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  // Initialize performance optimizations
  perf.init();

})();