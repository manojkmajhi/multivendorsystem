// Minimal Lazy Loading Implementation
(function() {
  'use strict';

  const LazyLoader = {
    observer: null,
    
    init() {
      if ('IntersectionObserver' in window) {
        this.observer = new IntersectionObserver(this.onIntersection.bind(this), {
          rootMargin: '50px 0px',
          threshold: 0.01
        });
        
        this.observeImages();
      } else {
        this.loadAllImages();
      }
    },
    
    observeImages() {
      const images = document.querySelectorAll('img[data-src], img.lazy-img');
      images.forEach(img => {
        if (!img.dataset.observed) {
          this.observer.observe(img);
          img.dataset.observed = 'true';
        }
      });
    },
    
    onIntersection(entries) {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          this.loadImage(img);
          this.observer.unobserve(img);
        }
      });
    },
    
    loadImage(img) {
      const src = img.dataset.src || img.getAttribute('data-src');
      if (!src) return;
      
      const tempImg = new Image();
      tempImg.onload = () => {
        img.src = src;
        img.classList.add('lazy-loaded');
        img.removeAttribute('data-src');
      };
      tempImg.onerror = () => {
        img.classList.add('lazy-error');
        img.style.opacity = '1';
      };
      tempImg.src = src;
    },
    
    loadAllImages() {
      const images = document.querySelectorAll('img[data-src]');
      images.forEach(img => this.loadImage(img));
    }
  };
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => LazyLoader.init());
  } else {
    LazyLoader.init();
  }
  
  window.LazyLoader = LazyLoader;
})();
