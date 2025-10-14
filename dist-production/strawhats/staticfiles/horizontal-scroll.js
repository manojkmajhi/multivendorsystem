// Modernized horizontal scroll: reduce layout thrashing, debounce resize/scroll
;(function(){
    var raf = window.requestAnimationFrame.bind(window);
    var menu = document.querySelector('.menu');
    if(!menu) return;

    var leftPaddle = document.querySelector('.left-paddle');
    var rightPaddle = document.querySelector('.right-paddle');
    var paddleMargin = 20;

    // cache item size/count and recompute on resize
    var itemSize = 0, itemsLength = 0, menuWrapperSize = 0, menuSize = 0, menuInvisibleSize = 0;
    function recompute() {
        var firstItem = menu.querySelector('.scroll-item');
        itemSize = firstItem ? (firstItem.getBoundingClientRect().width) : 0;
        itemsLength = menu.querySelectorAll('.scroll-item').length;
        menuWrapperSize = document.querySelector('.scroll-menu-wrapper') ? document.querySelector('.scroll-menu-wrapper').getBoundingClientRect().width : menu.clientWidth;
        menuSize = itemsLength * itemSize + 100;
        menuInvisibleSize = Math.max(0, menuSize - menuWrapperSize);
    }

    var resizeTimeout;
    window.addEventListener('resize', function(){
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(recompute, 120);
    }, { passive: true });

    recompute();

    // debounce scroll handling and only update paddles using rAF
    var scheduled = false;
    function onScroll() {
        if(scheduled) return;
        scheduled = true;
        raf(function(){
            scheduled = false;
            var menuPosition = menu.scrollLeft;
            var menuEndOffset = menuInvisibleSize - paddleMargin;
            if (menuPosition <= paddleMargin) {
                leftPaddle && leftPaddle.classList.add('hidden');
                rightPaddle && rightPaddle.classList.remove('hidden');
            } else if (menuPosition < menuEndOffset) {
                leftPaddle && leftPaddle.classList.remove('hidden');
                rightPaddle && rightPaddle.classList.remove('hidden');
            } else {
                leftPaddle && leftPaddle.classList.remove('hidden');
                rightPaddle && rightPaddle.classList.add('hidden');
            }
        });
    }

    menu.addEventListener('scroll', onScroll, { passive: true });

    // Smooth scrolling using native API where available
    function smoothScrollTo(x, duration) {
        if ('scrollBehavior' in document.documentElement.style) {
            menu.scrollTo({ left: x, behavior: 'smooth' });
            return;
        }
        // fallback: rAF based smooth scroll
        var start = menu.scrollLeft;
        var change = x - start;
        var startTime = performance.now();
        duration = duration || 300;
        function animate(now){
            var t = Math.min(1, (now - startTime) / duration);
            // easeInOutQuad
            t = t<0.5 ? 2*t*t : -1+(4-2*t)*t;
            menu.scrollLeft = start + change * t;
            if(t < 1) requestAnimationFrame(animate);
        }
        requestAnimationFrame(animate);
    }

    if(rightPaddle) rightPaddle.addEventListener('click', function(){ smoothScrollTo(menuInvisibleSize, 300); });
    if(leftPaddle) leftPaddle.addEventListener('click', function(){ smoothScrollTo(0, 300); });
})();