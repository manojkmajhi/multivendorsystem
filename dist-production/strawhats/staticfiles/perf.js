// perf.js - small runtime improvements for smoother rendering and lazy loading
;(function(){
  // Prefer using will-change and transform hints for elements that animate
  try{
    var style = document.createElement('style');
    style.textContent = '\n' +
      '.animated, .floating-cart-notification, .floating-cart-arrow, .suggestion-item img { will-change: transform, opacity; }\n' +
      '.search-suggestions { transform: translateZ(0); }\n' +
      '@media (prefers-reduced-motion: reduce) { * { transition: none !important; animation: none !important; } }\n';
    document.head.appendChild(style);
  }catch(e){}

  // Enhanced lazy loader for images with data-src/data-srcset
  function initLazyImages(){
    var imgs = [].slice.call(document.querySelectorAll('img[data-src], img[data-srcset]'));
    if(!imgs.length) return;
    if('IntersectionObserver' in window){
      var io = new IntersectionObserver(function(entries){
        entries.forEach(function(entry){
          if(entry.isIntersecting){
            var img = entry.target;
            if(img.dataset.src) img.src = img.dataset.src;
            if(img.dataset.srcset) img.srcset = img.dataset.srcset;
            img.removeAttribute('data-src'); img.removeAttribute('data-srcset');
            io.unobserve(img);
          }
        });
      }, { rootMargin: '200px 0px' });
      imgs.forEach(function(i){ io.observe(i); });
    } else {
      // eager fallback
      imgs.forEach(function(i){ if(i.dataset.src) i.src = i.dataset.src; if(i.dataset.srcset) i.srcset = i.dataset.srcset; });
    }
  }

  if(document.readyState === 'complete' || document.readyState === 'interactive'){
    setTimeout(initLazyImages, 60);
  } else {
    document.addEventListener('DOMContentLoaded', function(){ setTimeout(initLazyImages, 60); });
  }

  // Preload critical assets (logo) for LCP
  try{
    var logo = document.querySelector('nav .navbar-brand img');
    if(logo && logo.src){
      var l = document.createElement('link');
      l.rel = 'preload';
      l.as = 'image';
      l.href = logo.src;
      document.head.appendChild(l);
    }
  }catch(e){}

  // Reduce forced synchronous layout: helper to batch reads
  window.batchRead = window.batchRead || function(reads, writes){
    // reads: array of functions returning something; writes: array of functions to run
    var results = reads.map(function(fn){ try { return fn(); } catch(e){ return null; } });
    writes && writes.forEach(function(fn){ try{ fn(); }catch(e){} });
    return results;
  };

})();
