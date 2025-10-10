// Advanced image optimization and lazy loading system
;(function() {
  'use strict';

  const ImageOptimizer = {
    // Configuration
    config: {
      rootMargin: '50px 0px',
      threshold: 0.01,
      fadeInDuration: 300,
      preloadCount: 3,
      webpSupport: null,
      retryAttempts: 2
    },

    // Initialize image optimization
    init() {
      this.detectWebPSupport();
      this.setupLazyLoading();
      this.preloadCriticalImages();
      this.optimizeExistingImages();
      this.setupImageErrorHandling();
    },

    // Detect WebP support for better compression
    detectWebPSupport() {
      return new Promise((resolve) => {
        const webP = new Image();
        webP.onload = webP.onerror = () => {
          this.config.webpSupport = (webP.height === 2);
          resolve(this.config.webpSupport);
        };
        webP.src = 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA';
      });
    },

    // Setup advanced lazy loading with intersection observer
    setupLazyLoading() {
      if (!('IntersectionObserver' in window)) {
        this.fallbackLazyLoading();
        return;
      }

      const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target;
            this.loadImageOptimized(img);
            observer.unobserve(img);
          }
        });
      }, {
        rootMargin: this.config.rootMargin,
        threshold: this.config.threshold
      });

      // Observe all lazy images
      this.getLazyImages().forEach(img => {
        this.prepareImageForLazyLoading(img);
        imageObserver.observe(img);
      });
    },

    // Get all images that should be lazy loaded
    getLazyImages() {
      return Array.from(document.querySelectorAll('img[data-src], img[loading="lazy"]:not([src])'));
    },

    // Prepare image for lazy loading
    prepareImageForLazyLoading(img) {
      // Add loading placeholder
      if (!img.src || img.src === img.dataset.src) {
        img.src = this.generatePlaceholder(img);
      }
      
      // Add CSS classes for smooth transitions
      img.classList.add('lazy-image');
      img.style.opacity = '0';
      img.style.transition = `opacity ${this.config.fadeInDuration}ms ease-in-out`;
      
      // Add loading state
      img.setAttribute('data-loading', 'true');
    },

    // Generate optimized placeholder
    generatePlaceholder(img) {
      const width = img.getAttribute('width') || img.offsetWidth || 300;
      const height = img.getAttribute('height') || img.offsetHeight || 200;
      
      // Create SVG placeholder with proper aspect ratio
      const svg = `
        <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
          <rect width="100%" height="100%" fill="#f0f0f0"/>
          <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="14" fill="#999" text-anchor="middle" dy=".3em">Loading...</text>
        </svg>
      `;
      
      return `data:image/svg+xml;base64,${btoa(svg)}`;
    },

    // Load image with optimization
    loadImageOptimized(img) {
      const originalSrc = img.dataset.src || img.src;
      if (!originalSrc) return;

      // Create optimized image URL (responsive)
      const optimizedSrc = this.getResponsiveImageUrl(this.getOptimizedImageUrl(originalSrc), img);

      // Concurrency control
      if (!this._loadQueue) this._loadQueue = [];
      if (!this._activeLoads) this._activeLoads = 0;
      const maxParallel = 4;

      const startLoad = () => {
        this._activeLoads = (this._activeLoads || 0) + 1;
        const tempImg = new Image();
        tempImg.onload = () => {
          img.src = optimizedSrc;
          img.removeAttribute('data-src');
          img.removeAttribute('data-loading');
          img.classList.add('lazy-loaded');
          requestAnimationFrame(() => { img.style.opacity = '1'; });
          img.dispatchEvent(new CustomEvent('imageLoaded', { detail: { src: optimizedSrc, originalSrc } }));
          this._activeLoads = Math.max(0, this._activeLoads - 1);
          // start next in queue
          const next = this._loadQueue.shift(); if (next) setTimeout(next, 40);
        };
        tempImg.onerror = () => {
          this._activeLoads = Math.max(0, this._activeLoads - 1);
          this.handleImageError(img, originalSrc);
          const next = this._loadQueue.shift(); if (next) setTimeout(next, 40);
        };
        // Start with a tiny stagger to avoid bursts
        setTimeout(() => { tempImg.src = optimizedSrc; }, Math.random() * 120);
      };

      const enqueue = () => {
        if (this._activeLoads < maxParallel) startLoad();
        else this._loadQueue.push(startLoad);
      };

      enqueue();
    },

    // Get optimized image URL (add WebP support, compression, etc.)
    getOptimizedImageUrl(src) {
      // If WebP is supported and image is not already WebP
      if (this.config.webpSupport && !src.includes('.webp')) {
        // Try to convert to WebP (this would need server-side support)
        const webpSrc = src.replace(/\.(jpg|jpeg|png)$/i, '.webp');
        return webpSrc;
      }
      
      // Add compression parameters if supported by your image service
      if (src.includes('/media/') || src.includes('/staticfiles/')) {
        // Add quality and format parameters
        const separator = src.includes('?') ? '&' : '?';
        return `${src}${separator}q=85&f=auto`;
      }
      
      return src;
    },

    // Handle image loading errors
    handleImageError(img, originalSrc, attempt = 1) {
      if (attempt <= this.config.retryAttempts) {
        // Retry with original URL
        setTimeout(() => {
          const retryImg = new Image();
          retryImg.onload = () => {
            img.src = originalSrc;
            img.style.opacity = '1';
            img.classList.add('lazy-loaded');
          };
          retryImg.onerror = () => {
            this.handleImageError(img, originalSrc, attempt + 1);
          };
          retryImg.src = originalSrc;
        }, attempt * 1000);
      } else {
        // Show fallback image
        img.src = this.getFallbackImage();
        img.style.opacity = '1';
        img.classList.add('lazy-error');
        
        console.warn('Failed to load image after retries:', originalSrc);
      }
    },

    // Get fallback image for errors
    getFallbackImage() {
      return 'data:image/svg+xml;base64,' + btoa(`
        <svg width="300" height="200" xmlns="http://www.w3.org/2000/svg">
          <rect width="100%" height="100%" fill="#f8f9fa" stroke="#dee2e6"/>
          <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="14" fill="#6c757d" text-anchor="middle" dy=".3em">Image not available</text>
        </svg>
      `);
    },

    // Fallback for browsers without IntersectionObserver
    fallbackLazyLoading() {
      const images = this.getLazyImages();
      
      const loadVisibleImages = () => {
        images.forEach(img => {
          if (this.isImageInViewport(img)) {
            this.loadImageOptimized(img);
          }
        });
      };

      // Load images on scroll and resize
      let ticking = false;
      const handleScroll = () => {
        if (!ticking) {
          requestAnimationFrame(() => {
            loadVisibleImages();
            ticking = false;
          });
          ticking = true;
        }
      };

      window.addEventListener('scroll', handleScroll, { passive: true });
      window.addEventListener('resize', handleScroll, { passive: true });
      
      // Initial load
      loadVisibleImages();
    },

    // Check if image is in viewport (fallback method)
    isImageInViewport(img) {
      const rect = img.getBoundingClientRect();
      const windowHeight = window.innerHeight || document.documentElement.clientHeight;
      const windowWidth = window.innerWidth || document.documentElement.clientWidth;
      
      return (
        rect.top >= -50 &&
        rect.left >= -50 &&
        rect.bottom <= windowHeight + 50 &&
        rect.right <= windowWidth + 50
      );
    },

    // Preload only truly critical images to avoid bandwidth spikes
    preloadCriticalImages() {
      const criticalImages = [
        '/staticfiles/brand.svg',
        '/staticfiles/hero-banner.jpg'
      ];

      // Optionally preload the very first product image if present
      const firstProduct = document.querySelector('.product img, .hero img');
      const productImages = firstProduct ? [firstProduct.src || firstProduct.dataset.src] : [];

      [...criticalImages, ...productImages].forEach(src => {
        if (src && !src.startsWith('data:')) {
          const link = document.createElement('link');
          link.rel = 'preload';
          link.as = 'image';
          link.href = this.getOptimizedImageUrl(src);
          document.head.appendChild(link);
        }
      });
    },

    // Optimize existing images that are already loaded
    optimizeExistingImages() {
      const existingImages = Array.from(document.querySelectorAll('img[src]:not([data-src]):not(.lazy-image)'));
      
      existingImages.forEach(img => {
        // Add smooth loading transition
        if (!img.complete) {
          img.style.opacity = '0';
          img.style.transition = `opacity ${this.config.fadeInDuration}ms ease-in-out`;
          
          img.onload = () => {
            img.style.opacity = '1';
          };
        }
        
        // Add error handling
        img.onerror = () => {
          this.handleImageError(img, img.src);
        };
      });
    },

    // Setup global image error handling
    setupImageErrorHandling() {
      // Global error handler for all images
      document.addEventListener('error', (e) => {
        if (e.target.tagName === 'IMG') {
          this.handleImageError(e.target, e.target.src);
        }
      }, true);
    },

    // Progressive image enhancement for product images
    enhanceProductImages() {
      const productImages = document.querySelectorAll('.product img, .product-grid img');
      
      productImages.forEach(img => {
        // Add hover effect optimization
        img.addEventListener('mouseenter', () => {
          if (!img.dataset.hoverOptimized) {
            img.style.willChange = 'transform';
            img.dataset.hoverOptimized = 'true';
          }
        }, { once: true });
        
        // Remove will-change after animation
        img.addEventListener('mouseleave', () => {
          setTimeout(() => {
            img.style.willChange = 'auto';
          }, 300);
        });
      });
    },

    // Responsive image loading based on device
    getResponsiveImageUrl(src, img) {
      const devicePixelRatio = window.devicePixelRatio || 1;
      const imgWidth = img.offsetWidth || parseInt(img.getAttribute('width')) || 300;
      
      // Calculate optimal image size
      const optimalWidth = Math.ceil(imgWidth * devicePixelRatio);
      
      // Add responsive parameters if your image service supports it
      if (src.includes('/media/') || src.includes('/staticfiles/')) {
        const separator = src.includes('?') ? '&' : '?';
        return `${src}${separator}w=${optimalWidth}&q=85&f=auto`;
      }
      
      return src;
    },

    // Add CSS for image optimization
    addOptimizationCSS() {
      const style = document.createElement('style');
      style.textContent = `
        .lazy-image {
          background-color: #f8f9fa;
          background-image: linear-gradient(45deg, #f8f9fa 25%, transparent 25%), 
                           linear-gradient(-45deg, #f8f9fa 25%, transparent 25%), 
                           linear-gradient(45deg, transparent 75%, #f8f9fa 75%), 
                           linear-gradient(-45deg, transparent 75%, #f8f9fa 75%);
          background-size: 20px 20px;
          background-position: 0 0, 0 10px, 10px -10px, -10px 0px;
        }
        
        .lazy-loaded {
          background: none !important;
        }
        
        .lazy-error {
          background-color: #f8d7da !important;
          border: 1px solid #f5c6cb;
        }
        
        /* Optimize image rendering */
        img {
          image-rendering: -webkit-optimize-contrast;
          image-rendering: optimize-contrast;
        }
        
        /* Prevent layout shift */
        img[width][height] {
          height: auto;
        }
        
        /* Smooth transitions for all images */
        .product img, .hero img, .category-item img {
          transition: transform 0.3s ease-out, opacity 0.3s ease-in-out;
        }
      `;
      document.head.appendChild(style);
    }
  };

  // Initialize image optimization
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      ImageOptimizer.addOptimizationCSS();
      ImageOptimizer.init();
      ImageOptimizer.enhanceProductImages();
    });
  } else {
    ImageOptimizer.addOptimizationCSS();
    ImageOptimizer.init();
    ImageOptimizer.enhanceProductImages();
  }

  // Expose for manual usage
  window.ImageOptimizer = ImageOptimizer;

})();