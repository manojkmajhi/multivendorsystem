/**
 * Variant Support for Product Quickview Modal
 */

function openQuickviewWithVariants(productData) {
  const { id, image, name, price, short_description, link, has_variants, variants, attributes } = productData;
  
  $('#quickview-img').attr('src', image);
  $('#quickview-img-link').attr('href', link);
  $('#quickview-title').text(name);
  $('#quickview-description').text(short_description || 'Premium quality product');
  $('#quickview-qty').val('1');

  // Clear previous variant UI
  $('#quickview-size-block').hide();
  $('#quickview-color-block').hide();
  $('#quickview-variant-selector').remove();

  if (has_variants && variants && variants.length > 0) {
    renderQuickviewVariants(id, price, variants);
  } else {
    $('#quickview-price').text('Rs. ' + price);
    $('#quickview-add-to-cart').data('product-id', id).data('variant-id', null);
  }

  $('#productQuickView').modal('show');
}

function renderQuickviewVariants(productId, basePrice, variants) {
  const attrNames = Object.keys(variants[0].attribute_combination || {});
  
  let html = '<div id="quickview-variant-selector" style="margin: 1rem 0;">';
  
  attrNames.forEach(attrName => {
    const values = [...new Set(variants.map(v => v.attribute_combination[attrName]))];
    html += `
      <div class="variant-block">
        <div class="quickview-section-label">${attrName}</div>
        <select class="quickview-select quickview-variant-attr" data-attribute="${attrName}">
          <option value="">Select ${attrName}</option>
          ${values.map(v => `<option value="${v}">${v}</option>`).join('')}
        </select>
      </div>
    `;
  });
  
  html += '<div id="quickview-variant-info" style="display:none; margin-top: 0.5rem; padding: 0.5rem; background: #f8f9fa; border-radius: 4px;"></div>';
  html += '</div>';
  
  $('#quickview-description').after(html);
  
  // Store data
  $('#quickview-add-to-cart').data('product-id', productId)
    .data('base-price', basePrice)
    .data('variants', variants)
    .data('selected-variant', null);
  
  // Bind change event
  $('.quickview-variant-attr').on('change', function() {
    updateQuickviewVariant();
  });
}

function updateQuickviewVariant() {
  const selectedOptions = {};
  $('.quickview-variant-attr').each(function() {
    const attr = $(this).data('attribute');
    const value = $(this).val();
    if (value) selectedOptions[attr] = value;
  });
  
  const variants = $('#quickview-add-to-cart').data('variants');
  const basePrice = $('#quickview-add-to-cart').data('base-price');
  
  const matchedVariant = variants.find(v => {
    const combo = v.attribute_combination || {};
    return Object.keys(selectedOptions).every(key => combo[key] === selectedOptions[key]) &&
           Object.keys(combo).length === Object.keys(selectedOptions).length;
  });
  
  if (matchedVariant) {
    const finalPrice = parseFloat(basePrice) + parseFloat(matchedVariant.price_adjustment || 0);
    $('#quickview-price').text('Rs. ' + finalPrice.toFixed(2));
    $('#quickview-variant-info').html(`
      <div style="font-size: 12px; color: #666;">
        <div>Stock: ${matchedVariant.stock}</div>
        <div>SKU: ${matchedVariant.sku}</div>
      </div>
    `).show();
    
    $('#quickview-add-to-cart').data('selected-variant', matchedVariant.id)
      .prop('disabled', matchedVariant.stock <= 0)
      .text(matchedVariant.stock <= 0 ? 'Out of Stock' : 'Add to Cart');
    
    if (matchedVariant.image) {
      $('#quickview-img').attr('src', matchedVariant.image);
    }
  } else {
    $('#quickview-variant-info').hide();
    $('#quickview-price').text('Rs. ' + basePrice);
    $('#quickview-add-to-cart').data('selected-variant', null).prop('disabled', true).text('Select Options');
  }
}

// Override add to cart for quickview
$(document).ready(function() {
  $('#quickview-add-to-cart').off('click').on('click', function() {
    const productId = $(this).data('product-id');
    const variantId = $(this).data('selected-variant');
    const qty = $('#quickview-qty').val();
    
    if (!productId) return;
    
    addToCart(productId, qty, true, variantId);
    $('#productQuickView').modal('hide');
  });
});
