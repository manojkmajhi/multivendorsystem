$(function () {


    /* ===============================================================
         LIGHTBOX
      =============================================================== */
    if (typeof lightbox !== 'undefined') {
        lightbox.option({
            'resizeDuration': 200,
            'wrapAround': true
        });
    }


    /* ===============================================================
         PRODUCT SLIDER
      =============================================================== */
    $('.product-slider').owlCarousel({
        items: 1,
        thumbs: true,
        thumbImage: false,
        thumbsPrerendered: true,
        thumbContainerClass: 'owl-thumbs',
        thumbItemClass: 'owl-thumb-item'
    });


    /* ===============================================================
         PRODUCT QUNATITY
      =============================================================== */
      $(document).on('click', '.dec-btn', function () {
          var siblings = $(this).siblings('input');
          if (parseInt(siblings.val(), 10) >= 1) {
              siblings.val(parseInt(siblings.val(), 10) - 1);
          }
      });

      $(document).on('click', '.inc-btn', function () {
          var siblings = $(this).siblings('input');
          siblings.val(parseInt(siblings.val(), 10) + 1);
      });


      /* ===============================================================
           BOOTSTRAP SELECT
        =============================================================== */
      $('.selectpicker').on('change', function () {
          $(this).closest('.dropdown').find('.filter-option-inner-inner').addClass('selected');
      });


      /* ===============================================================
           TOGGLE ALTERNATIVE BILLING ADDRESS
        =============================================================== */
      $('#alternateAddressCheckbox').on('change', function () {
         var checkboxId = '#' + $(this).attr('id').replace('Checkbox', '');
         $(checkboxId).toggleClass('d-none');
      });


      /* ===============================================================
           DISABLE UNWORKED ANCHORS
        =============================================================== */
      $('a[href="#"]').on('click', function (e) {
         e.preventDefault();
      });

      /* ===============================================================
           SEARCH AUTOCOMPLETE
        =============================================================== */
      var searchTimeout;
      var $searchInput = $('#search');
      var $searchSuggestions = $('<div class="search-suggestions"></div>');
      
      // Add suggestions container after search input
      if ($searchInput.length) {
          $searchInput.parent().css('position', 'relative');
          $searchInput.after($searchSuggestions);
      }

      $searchInput.on('input', function() {
          var query = $(this).val().trim();
          
          clearTimeout(searchTimeout);
          
          if (query.length < 2) {
              $searchSuggestions.hide().empty();
              return;
          }
          
          searchTimeout = setTimeout(function() {
              $.ajax({
                  url: '/api/search-suggestions',
                  data: { q: query },
                  success: function(response) {
                      if (response.suggestions && response.suggestions.length > 0) {
                          var html = '';
                          response.suggestions.forEach(function(item) {
                              html += '<div class="suggestion-item" data-id="' + item.id + '">';
                              html += '<img src="' + item.image + '" alt="' + item.name + '">';
                              html += '<div class="suggestion-info">';
                              html += '<div class="suggestion-name">' + item.name + '</div>';
                              html += '<div class="suggestion-price">Rs. ' + item.price + '</div>';
                              html += '</div>';
                              html += '</div>';
                          });
                          $searchSuggestions.html(html).show();
                      } else {
                          $searchSuggestions.html('<div class="no-suggestions">No products found</div>').show();
                      }
                  },
                  error: function() {
                      console.error('Failed to fetch search suggestions');
                  }
              });
          }, 300);
      });

      // Click on suggestion to go to product
      $(document).on('click', '.suggestion-item', function() {
          var productId = $(this).data('id');
          window.location.href = '/details/' + productId + '/';
      });

      // Hide suggestions when clicking outside
      $(document).on('click', function(e) {
          if (!$(e.target).closest('#search, .search-suggestions').length) {
              $searchSuggestions.hide();
          }
      });

      // Show suggestions when focusing search input if there's content
      $searchInput.on('focus', function() {
          if ($(this).val().trim().length >= 2 && $searchSuggestions.children().length > 0) {
              $searchSuggestions.show();
          }
      });

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
