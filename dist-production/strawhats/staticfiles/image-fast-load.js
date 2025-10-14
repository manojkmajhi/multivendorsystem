// Ultra-Fast Image Loading System
;(function() {
  'use strict';

  const FastImageLoader = {
    observer: null,
    loadQueue: [],
    activeLoads: 0,
    maxParallel: 6,
    
    init() {
      this.setupIntersectionObserver();
      this.preloadCriticalImages();
      this.optimizeExistingImages();
      this.addProgressiveCSS();
    },

    setupIntersectionObserver() {
      if (!('IntersectionObserver' in window)) {
        this.loadAllImages();
        return;
      }

      this.observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            this.queueImageLoad(entry.target);
            this.observer.unobserve(entry.target);
          }
        });
      }, {
        rootMargin: '100px 0px',
        threshold: 0.01
      });

      this.observeImages();
    },

    observeImages() {
      const images = document.querySelectorAll('img[loading="lazy"], img[data-src]');
      images.forEach(img => {
        if (!img.dataset.observed) {
          this.prepareImage(img);
          this.observer.observe(img);
          img.dataset.observed = 'true';
        }
      });
    },

    prepareImage(img) {
      if (!img.src || img.src === img.dataset.src) {
        img.src = this.getPlaceholder(img);
      }
      img.style.opacity = '0';
      img.style.transition = 'opacity 0.3s ease-in-out';
    },

    getPlaceholder(img) {
      const w = img.getAttribute('width') || 300;
      const h = img.getAttribute('height') || 200;
      return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}'%3E%3Crect fill='%23f0f0f0' width='${w}' height='${h}'/%3E%3C/svg%3E`;
    },

    queueImageLoad(img) {
      if (this.activeLoads < this.maxParallel) {
        this.loadImage(img);
      } else {
        this.loadQueue.push(img);
      }
    },

    loadImage(img) {
      this.activeLoads++;
      
      const src = img.dataset.src || img.getAttribute('data-src') || img.src;
      if (!src || src.startsWith('data:')) {
        this.activeLoads--;
        this.processQueue();
        return;
      }

      const tempImg = new Image();
      
      tempImg.onload = () => {
        img.src = src;
        img.removeAttribute('data-src');
        img.style.opacity = '1';
        img.classList.add('loaded');
        this.activeLoads--;
        this.processQueue();
      };

      tempImg.onerror = () => {
        img.src = this.getFallbackImage();
        img.style.opacity = '1';
        this.activeLoads--;
        this.processQueue();
      };

      tempImg.src = src;
    },

    processQueue() {
      if (this.loadQueue.length > 0 && this.activeLoads < this.maxParallel) {
        const img = this.loadQueue.shift();
        this.loadImage(img);
      }
    },

    getFallbackImage() {
      return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='200'%3E%3Crect fill='%23f8f9fa' width='300' height='200'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' fill='%236c757d' font-size='14'%3EImage unavailable%3C/text%3E%3C/svg%3E`;
    },

    preloadCriticalImages() {
      const critical = [
        document.querySelector('.navbar-brand img')?.src,
        document.querySelector('.hero img, #hero-carousel img')?.src,
        ...Array.from(document.querySelectorAll('.product img')).slice(0, 4).map(img => img.src)
      ].filter(Boolean);

      critical.forEach(src => {
        if (src && !src.startsWith('data:')) {
          const link = document.createElement('link');
          link.rel = 'preload';
          link.as = 'image';
          link.href = src;
          document.head.appendChild(link);
        }
      });
    },

    optimizeExistingImages() {
      const images = document.querySelectorAll('img:not([loading="lazy"]):not([data-src])');
      images.forEach(img => {
        if (!img.complete) {
          img.style.opacity = '0';
          img.style.transition = 'opacity 0.3s ease-in-out';
          img.onload = () => { img.style.opacity = '1'; };
        }
      });
    },

    loadAllImages() {
      const images = document.querySelectorAll('img[data-src]');
      images.forEach(img => this.loadImage(img));
    },

    addProgressiveCSS() {
      const style = document.createElement('style');
      style.textContent = `
        img { 
          image-rendering: -webkit-optimize-contrast;
          image-rendering: crisp-edges;
        }
        img.loaded {
          animation: fadeIn 0.3s ease-in-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .product img, .category-item img {
          background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
        }
        .product img.loaded, .category-item img.loaded {
          background: none;
          animation: fadeIn 0.3s ease-in-out;
        }
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `;
      document.head.appendChild(style);
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => FastImageLoader.init());
  } else {
    FastImageLoader.init();
  }

  window.FastImageLoader = FastImageLoader;

})();
