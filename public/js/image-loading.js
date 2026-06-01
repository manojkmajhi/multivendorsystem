// Professional Image Loading Handler
(function() {
  'use strict';
  
  function handleImageLoad(img) {
    if (img.complete && img.naturalHeight !== 0) {
      img.classList.add('loaded');
    } else {
      img.addEventListener('load', function() {
        img.classList.add('loaded');
      }, { once: true });
      
      img.addEventListener('error', function() {
        img.classList.add('loaded');
        img.style.opacity = '0.3';
      }, { once: true });
    }
  }
  
  function initImages() {
    const images = document.querySelectorAll('.product-img-container img, .category-img-container img, .rec-img-container img');
    images.forEach(handleImageLoad);
  }
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initImages);
  } else {
    initImages();
  }
  
  // Handle dynamically added images
  if (window.MutationObserver) {
    const observer = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        mutation.addedNodes.forEach(function(node) {
          if (node.nodeType === 1) {
            const imgs = node.querySelectorAll ? node.querySelectorAll('.product-img-container img, .category-img-container img, .rec-img-container img') : [];
            imgs.forEach(handleImageLoad);
          }
        });
      });
    });
    
    observer.observe(document.body, { childList: true, subtree: true });
  }
})();
