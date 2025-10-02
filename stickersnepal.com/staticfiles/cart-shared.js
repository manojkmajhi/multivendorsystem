// Cart functionality shared across all pages
// Cookie helper
function getCookie(name) {
  var cookieValue = null;
  if (document.cookie && document.cookie !== '') {
    var cookies = document.cookie.split(';');
    for (var i = 0; i < cookies.length; i++) {
      var cookie = cookies[i].trim();
      if (cookie.substring(0, name.length + 1) === (name + '=')) {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}

// UUID generator for device ID
function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Main add to cart function
function addToCart(product_id, product_qty, show_cart) {
  var device = getCookie('device');
  if (device == null || device == undefined) {
    device = uuidv4();
  }
  document.cookie = 'device=' + device + ";domain=;path=/";

  $.ajax({
    url: '/add_to_cart/',
    data: {
      'productid': product_id,
      'qty': product_qty
    },
    success: function(data) {
      console.log('✓ Added to cart:', data);
      if (show_cart) {
        $("#triggerButton").click();
        $("#triggerButton").prop('checked', true);
      } else {
        if ($("#triggerButton").is(':checked')) {
          $("#triggerButton").click();
          $("#triggerButton").prop('checked', true);
        }
      }
      updateCartCount();
    },
    error: function(xhr, status, error) {
      console.error('❌ Failed to add to cart:', error);
      alert('Failed to add item to cart. Please try again.');
    }
  });
  
  $(".floating-cart-notification").fadeIn(300).show();
  showCartArrow();
  showAddedMessage(product_id);
}

// Show cart arrow indicator
function showCartArrow() {
  if (!(document.cookie.indexOf('cart_shown=') >= 0)) {
    $(".floating-cart-arrow").show().delay(450).fadeOut();
    document.cookie = 'cart_shown=seen';
  }
}

// Show "Added" message on product
function showAddedMessage(id) {
  $('.' + id + "-added-message").text("Added")
    .show()
    .delay(350)
    .fadeOut();
}

// Update cart count badge
function updateCartCount() {
  $.ajax({
    url: '/get_cart/',
    success: function(data) {
      if (data.cart && data.cart.length > 0) {
        var totalQty = 0;
        for (var i = 0; i < data.cart.length; i++) {
          totalQty += data.cart[i][2]; // qty is at index 2
        }
        if (totalQty > 0) {
          $('#cart-count').text(totalQty).show();
          $('.floating-cart-notification').show();
        } else {
          $('#cart-count').hide();
          $('.floating-cart-notification').hide();
        }
      } else {
        $('#cart-count').hide();
        $('.floating-cart-notification').hide();
      }
    }
  });
}

// Load cart contents when clicking cart button
$('#triggerButton').click(function (e) {
  loadCart();
});

// Close cart button
function closeButton() {
  $("#triggerButton").click();
  $("#triggerButton").prop('checked', false);
}

// Remove from cart function
function removeFromCart(productId) {
  $.ajax({
    url: '/remove_from_cart/',
    data: {
      'productid': productId
    },
    success: function(data) {
      console.log('✓ Removed from cart:', data);
      // Simply reload the cart content without closing/reopening
      updateCartCount();
      loadCart();
    },
    error: function(err) {
      console.error('Failed to remove from cart:', err);
      alert('Failed to remove item from cart');
    }
  });
}

// Load cart content into the floating cart
function loadCart() {
  $.ajax({
    url: '/get_cart/',
    success: function(data) {
      if (data.cart && data.cart.length > 0) {
        $('#nothing-in-cart').hide();
        $('#floating-cart-table').html('');
        $('#single-stickers-div').html('');
        $("#show-notshow").hide();
        var total = 0;
        var single = 0;
        var pack = 0;

        for (var i = 0; i < data.cart.length; i++) {
          if (data.cart[i][5] == "Sticker Pack") {
            pack += data.cart[i][2];
            total += data.cart[i][2] * 8;
            $('#floating-cart-table').append('<tr style="background-color: #fff; border-bottom: 5px solid #f4f5f9;"> <td class="px-1 py-1 border-0" scope="row"><div class="media align-items-center"><img src="' + data.cart[i][4] + '" width="60"/><div class="media-body ml-1" style="line-height: 14px;"><small>' + data.cart[i][1] + '<br><span class="px-1 small text-uppercase" style="color:#fff; background-color: #28a745;">' + data.cart[i][6] + ' PACK</span></small></div></div></td><td class="border-0 px-1 text-center" style="vertical-align:middle;"><small>' + data.cart[i][2] + '</small></td><td class="align-middle border-0"><p class="mb-0 ml-0 small">Rs.' + data.cart[i][2] * data.cart[i][3] + '</p></td><td class="border-0 text-center" style="vertical-align:middle;"><button class="btn btn-sm btn-link text-danger p-0 remove-from-cart" data-product-id="' + data.cart[i][0] + '" title="Remove"><i class="fas fa-times"></i></button></td></tr>');
          } else {
            single += data.cart[i][2];
            total += data.cart[i][2];
            if (data.cart[i][2] > 1) {
              $('#single-stickers-div').append('<div class="col-3 px-1 py-1 position-relative"><div class="small px-1 py-0" style="position: absolute; right: 0.4rem; top: 0.4rem; background-color: #000; color:#fff; border-radius:3px; z-index: 2;">' + data.cart[i][2] + '</div><button class="btn btn-sm btn-link text-danger p-0 remove-from-cart position-absolute" data-product-id="' + data.cart[i][0] + '" style="left: 0.2rem; top: 0.2rem; z-index: 2;" title="Remove"><i class="fas fa-times-circle"></i></button><img src="' + data.cart[i][4] + '"class="border" style="width:100%;" /></div>');
            } else {
              $('#single-stickers-div').append('<div class="col-3 px-1 py-1 position-relative"><button class="btn btn-sm btn-link text-danger p-0 remove-from-cart position-absolute" data-product-id="' + data.cart[i][0] + '" style="left: 0.2rem; top: 0.2rem; z-index: 2;" title="Remove"><i class="fas fa-times-circle"></i></button><img src="' + data.cart[i][4] + '" class="border" style="width:100%;" /></div>');
            }
          }
        }
        
        if (single > 0 && pack > 0) {
          $("#show-notshow").show();
        }

        if (pack > 0) {
          $("#pack-h5").html(String(pack) + ' Items (Pack)');
        }

        if (single > 0) {
          $("#single-h5").html(String(single) + ' Item' + (single > 1 ? 's' : ''));
        }
      } else {
        $('#nothing-in-cart').show();
        $('#nothing-in-cart').html('<strong class="h5 text-uppercase">Cart is Empty</strong>');
        $('#floating-cart-table').html('');
        $('#single-stickers-div').html('');
        $('#single-h5').html('');
        $('#pack-h5').html('');
      }
    },
    error: function(err) {
      console.error('Failed to load cart:', err);
    }
  });
}

// Event handler for remove buttons (using event delegation)
$(document).on('click', '.remove-from-cart', function(e) {
  e.preventDefault();
  var productId = $(this).data('product-id');
  removeFromCart(productId);
});

// Initialize cart count on page load
$(document).ready(function() {
  updateCartCount();
});
