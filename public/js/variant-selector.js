/**
 * Product Variant Selector
 * Handles dynamic variant selection on product pages
 */

class VariantSelector {
  constructor(productData) {
    this.product = productData;
    this.variants = productData.variants || [];
    this.attributes = productData.attributes || [];
    this.selectedOptions = {};
    this.currentVariant = null;
    
    this.init();
  }

  init() {
    if (!this.product.has_variants || this.variants.length === 0) {
      this.renderSimpleProduct();
    } else {
      this.renderVariantSelectors();
    }
  }

  renderSimpleProduct() {
    const container = document.getElementById('variantSelector');
    if (!container) return;
    
    container.innerHTML = `
      <div class="simple-product">
        <div class="price">${this.formatPrice(this.product.price)}</div>
        <div class="stock-info">${this.product.stock > 0 ? 'In Stock' : 'Out of Stock'}</div>
        <button class="btn-add-cart" onclick="addToCart('${this.product.id}', null)" ${this.product.stock <= 0 ? 'disabled' : ''}>
          Add to Cart
        </button>
      </div>
    `;
  }

  renderVariantSelectors() {
    const container = document.getElementById('variantSelector');
    if (!container) return;

    let html = '<div class="variant-selectors">';
    
    const attrNames = this.getAttributeNames();
    
    attrNames.forEach(attrName => {
      const values = this.getAttributeValues(attrName);
      html += `
        <div class="variant-attribute">
          <label class="variant-label">${attrName}</label>
          <select class="variant-select" data-attribute="${attrName}" onchange="variantSelector.onAttributeChange()">
            <option value="">Select ${attrName}</option>
            ${values.map(v => `<option value="${v}">${v}</option>`).join('')}
          </select>
        </div>
      `;
    });

    html += `
      <div class="variant-info" id="variantInfo" style="display:none;">
        <div class="variant-price" id="variantPrice"></div>
        <div class="variant-stock" id="variantStock"></div>
        <div class="variant-sku" id="variantSku"></div>
      </div>
      <button class="btn-add-cart" id="addToCartBtn" onclick="variantSelector.addSelectedToCart()" disabled>
        Select Options
      </button>
    `;
    
    html += '</div>';
    container.innerHTML = html;
  }

  getAttributeNames() {
    if (this.variants.length === 0) return [];
    const combo = this.variants[0].attribute_combination || {};
    return Object.keys(combo);
  }

  getAttributeValues(attrName) {
    const values = new Set();
    this.variants.forEach(v => {
      const combo = v.attribute_combination || {};
      if (combo[attrName]) values.add(combo[attrName]);
    });
    return Array.from(values);
  }

  onAttributeChange() {
    this.selectedOptions = {};
    document.querySelectorAll('.variant-select').forEach(select => {
      const attr = select.dataset.attribute;
      const value = select.value;
      if (value) this.selectedOptions[attr] = value;
    });

    this.currentVariant = this.findMatchingVariant();
    
    if (this.currentVariant) {
      this.displayVariantInfo();
      document.getElementById('addToCartBtn').disabled = this.currentVariant.stock <= 0;
      document.getElementById('addToCartBtn').textContent = this.currentVariant.stock <= 0 ? 'Out of Stock' : 'Add to Cart';
    } else {
      document.getElementById('variantInfo').style.display = 'none';
      document.getElementById('addToCartBtn').disabled = true;
      document.getElementById('addToCartBtn').textContent = 'Select Options';
    }

    if (this.currentVariant && this.currentVariant.image) {
      const mainImg = document.querySelector('.product-main-image');
      if (mainImg) mainImg.src = this.currentVariant.image;
    }
  }

  findMatchingVariant() {
    return this.variants.find(v => {
      const combo = v.attribute_combination || {};
      return Object.keys(this.selectedOptions).every(key => 
        combo[key] === this.selectedOptions[key]
      ) && Object.keys(combo).length === Object.keys(this.selectedOptions).length;
    });
  }

  displayVariantInfo() {
    const finalPrice = parseFloat(this.product.price) + parseFloat(this.currentVariant.price_adjustment || 0);
    
    document.getElementById('variantPrice').textContent = this.formatPrice(finalPrice);
    document.getElementById('variantStock').textContent = `Stock: ${this.currentVariant.stock}`;
    document.getElementById('variantSku').textContent = `SKU: ${this.currentVariant.sku}`;
    document.getElementById('variantInfo').style.display = 'block';
  }

  addSelectedToCart() {
    if (!this.currentVariant) return alert('Please select all options');
    addToCart(this.product.id, this.currentVariant.id);
  }

  formatPrice(price) {
    return `Rs. ${parseFloat(price).toFixed(2)}`;
  }
}

let variantSelector = null;

function initVariantSelector(productData) {
  variantSelector = new VariantSelector(productData);
}
