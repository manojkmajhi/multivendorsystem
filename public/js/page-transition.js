// Page Transition - Smooth fade between page navigations
(function() {
  // Show page loader on navigation
  document.addEventListener('click', function(e) {
    var link = e.target.closest('a[href]');
    if (!link) return;
    var href = link.getAttribute('href');
    // Only handle internal non-hash links
    if (!href || href.startsWith('#') || href.startsWith('javascript:') ||
        href.startsWith('mailto:') || href.startsWith('tel:') ||
        link.target === '_blank' || e.ctrlKey || e.metaKey) return;

    var loader = document.getElementById('page-loader');
    if (loader) {
      loader.classList.remove('loaded');
      loader.style.display = '';
    }
  });
})();
