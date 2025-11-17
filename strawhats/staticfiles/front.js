// Defer non-critical initializations to DOMContentLoaded for better LCP
document.addEventListener('DOMContentLoaded', function(){
    // LIGHTBOX init: non-blocking
    if (typeof lightbox !== 'undefined' && lightbox.option) {
        try { lightbox.option({ 'resizeDuration': 200, 'wrapAround': true }); } catch(e){}
    }

    // PRODUCT SLIDER: initialize if present (Owl handles its own optimizations)
    if (window.jQuery && jQuery.fn && jQuery.fn.owlCarousel) {
        try { $('.product-slider').owlCarousel({ items:1, thumbs:true, thumbImage:false, thumbsPrerendered:true, thumbContainerClass:'owl-thumbs', thumbItemClass:'owl-thumb-item' }); } catch(e){}
    }

    // Delegate quantity buttons using event delegation (less handlers)
    document.body.addEventListener('click', function(e){
        var dec = e.target.closest('.dec-btn');
        var inc = e.target.closest('.inc-btn');
        if(dec){
            var input = dec.parentElement.querySelector('input');
            if(input){ input.value = Math.max(0, (parseInt(input.value,10) || 0) - 1); }
        } else if(inc){
            var input2 = inc.parentElement.querySelector('input');
            if(input2){ input2.value = (parseInt(input2.value,10) || 0) + 1; }
        }
    });

    // Bootstrap select change handler (keep behavior)
    document.body.addEventListener('change', function(e){
        var t = e.target;
        if(t && t.classList && t.classList.contains('selectpicker')){
            var dd = t.closest('.dropdown');
            if(dd){ var inner = dd.querySelector('.filter-option-inner-inner'); inner && inner.classList.add('selected'); }
        }
    });

    // Toggle alternative billing address
    document.body.addEventListener('change', function(e){
        var t = e.target;
        if(t && t.id && t.id.indexOf('Checkbox')!==-1){
            var checkboxId = '#' + t.id.replace('Checkbox','');
            var el = document.querySelector(checkboxId);
            el && el.classList.toggle('d-none');
        }
    });

    // Disable empty anchors
    document.body.addEventListener('click', function(e){
        var a = e.target.closest('a');
        if(a && a.getAttribute('href') === '#'){ e.preventDefault(); }
    });

    /* SEARCH AUTOCOMPLETE - Abort previous requests and reduce DOM thrash */
    var searchInput = document.getElementById('search');
    if(searchInput){
        var searchSuggestions = document.createElement('div');
        searchSuggestions.className = 'search-suggestions';
        searchInput.parentElement && (searchInput.parentElement.style.position = 'relative');
        searchInput.parentElement && searchInput.parentElement.appendChild(searchSuggestions);

        var controller = null;
        var debounceTimer = null;
        searchInput.addEventListener('input', function(){
            var q = this.value.trim();
            if(debounceTimer) clearTimeout(debounceTimer);
            if(q.length < 2){
                searchSuggestions.style.display = 'none';
                searchSuggestions.classList.remove('show');
                searchSuggestions.innerHTML = '';
                return;
            }
            debounceTimer = setTimeout(function(){
                if(controller) { controller.abort(); }
                controller = new AbortController();
                fetch('/api/search-suggestions?q=' + encodeURIComponent(q), { signal: controller.signal }).then(function(r){ return r.json(); }).then(function(response){
                    if(response && response.suggestions && response.suggestions.length){
                        var frag = document.createDocumentFragment();
                        response.suggestions.forEach(function(item){
                            var div = document.createElement('div');
                            div.className = 'suggestion-item';
                            div.dataset.id = item.id;
                            var img = document.createElement('img'); img.src = item.image; img.alt = item.name; img.loading = 'lazy';
                            var info = document.createElement('div'); info.className = 'suggestion-info';
                            var name = document.createElement('div'); name.className = 'suggestion-name'; name.textContent = item.name;
                            info.appendChild(name);
                            if(item.snippet){ var sn = document.createElement('div'); sn.className='suggestion-snippet'; sn.textContent = item.snippet; info.appendChild(sn); }
                            var price = document.createElement('div'); price.className='suggestion-price'; price.textContent = 'Rs. ' + item.price; info.appendChild(price);
                            div.appendChild(img); div.appendChild(info); frag.appendChild(div);
                        });
                        searchSuggestions.innerHTML = '';
                        searchSuggestions.appendChild(frag);
                        searchSuggestions.style.display = 'block';
                        searchSuggestions.classList.add('show');
                    } else {
                        searchSuggestions.innerHTML = '<div class="no-suggestions">No products found</div>';
                        searchSuggestions.style.display='block';
                        searchSuggestions.classList.add('show');
                    }
                }).catch(function(err){ if(err.name === 'AbortError') return; console.error('Failed to fetch search suggestions', err); });
            }, 250);
        }, { passive: true });

        // Click through suggestions
        searchSuggestions.addEventListener('click', function(e){
            var item = e.target.closest('.suggestion-item');
            if(item) window.location.href = '/details/' + item.dataset.id + '/';
        });

        document.addEventListener('click', function(e){
            if(!e.target.closest('#search, .search-suggestions')) {
                searchSuggestions.style.display='none';
                searchSuggestions.classList.remove('show');
            }
        });
        searchInput.addEventListener('focus', function(){
            if(this.value.trim().length >=2 && searchSuggestions.children.length>0) {
                searchSuggestions.style.display='block';
                searchSuggestions.classList.add('show');
            }
        });
    }

});


// /* ===============================================================
//      COUNTRY SELECT BOX FILLING
//   =============================================================== */
// $.getJSON('js/countries.json', function (data) {
//     $.each(data, function (key, value) {
//         var selectOption = "<option value='" + value.name + "' data-dial-code='" + value.dial_code + "'>" + value.name + "</option>";
//         $("select.country").append(selectOption);
//     });
// })
