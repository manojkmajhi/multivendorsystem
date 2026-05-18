// Font Loader - Ensures stylesheets with rel="preload" switch to loaded state
(function() {
  // Handle preload-to-stylesheet fallback for browsers without native support
  var preloads = document.querySelectorAll('link[rel="preload"][as="style"]');
  for (var i = 0; i < preloads.length; i++) {
    var link = preloads[i];
    if (!link.onload) {
      link.onload = function() {
        this.onload = null;
        this.rel = 'stylesheet';
      };
    }
  }

  // Hide page loader once everything is loaded
  window.addEventListener('load', function() {
    var loader = document.getElementById('page-loader');
    if (loader) {
      loader.classList.add('loaded');
      setTimeout(function() { loader.style.display = 'none'; }, 400);
    }
  });
})();
