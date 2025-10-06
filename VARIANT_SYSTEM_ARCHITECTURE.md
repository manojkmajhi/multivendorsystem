# Product + Variant System Architecture

## 1. Data Model (JSON-like Structure)

### Products Table
```json
{
  "id": "uuid",
  "name": "T-Shirt",
  "price": 29.99,
  "category": "Apparel",
  "type": "clothing",
  "image": "/media/tshirt.jpg",
  "short_description": "Comfortable cotton tee",
  "long_description": "High quality...",
  "active": true,
  "has_variants": true,
  "base_sku": "TSH-001",
  "created_at": "timestamp"
}
```

### Attributes Table (Global attribute definitions)
```json
{
  "id": "uuid",
  "name": "Size",
  "slug": "size",
  "type": "select",
  "display_order": 1,
  "active": true
}
```

### Attribute Values Table
```json
{
  "id": "uuid",
  "attribute_id": "uuid",
  "value": "Medium",
  "display_order": 1
}
```

### Product Attributes (Link products to attributes)
```json
{
  "id": "uuid",
  "product_id": "uuid",
  "attribute_id": "uuid",
  "selected_values": ["value_id_1", "value_id_2"]
}
```

### Variants Table
```json
{
  "id": "uuid",
  "product_id": "uuid",
  "sku": "TSH-001-M-BLK",
  "price_adjustment": 0,
  "stock": 50,
  "image": "/media/tshirt-black-m.jpg",
  "active": true,
  "attribute_combination": {
    "size": "Medium",
    "color": "Black"
  }
}
```

## 2. Admin Panel Logic

### Product Form Toggle
- Checkbox: "This product has variants"
- If unchecked: Show simple product fields (price, stock, SKU)
- If checked: Show variant builder interface

### Variant Builder Flow
1. **Select Attributes**: Choose from global attributes (Size, Color, etc.)
2. **Define Values**: For each attribute, select applicable values
3. **Generate Variants**: Auto-create all combinations
4. **Customize Variants**: Edit price, stock, SKU, image per variant

### Dynamic Attribute Management
- Create custom attributes on-the-fly
- Reusable across products
- Type support: select, color, text, number

## 3. Frontend Logic

### Product Page Rendering
```javascript
if (product.has_variants) {
  // Show variant selector dropdowns
  // Update price/image on selection
  // Add selected variant to cart
} else {
  // Show simple add-to-cart button
  // Use base product price
}
```

### Variant Selection UX
- Dropdown per attribute
- Real-time price update
- Image swap on selection
- Stock availability indicator
- Disabled combinations if out of stock

## 4. Scalability Plan

### Custom Attributes
- Admin can create unlimited attribute types
- Support for: text, number, select, color, boolean
- Conditional visibility rules

### Variant Images
- Each variant can have unique image
- Fallback to product base image
- Gallery support for multiple images per variant

### Conditional Logic
- Show/hide attributes based on selections
- Price rules (e.g., +$5 for XL sizes)
- Stock management per variant

### Import/Export
- CSV format with variant columns
- Bulk variant generation
- Template download for easy data entry

## 5. Database Relationships

```
products (1) ──→ (many) product_attributes
                         ↓
                    attributes (1) ──→ (many) attribute_values
                    
products (1) ──→ (many) variants
```

## 6. Cart Integration

### Cart Item Structure
```json
{
  "product_id": "uuid",
  "variant_id": "uuid or null",
  "qty": 2,
  "price": 29.99,
  "variant_label": "Size: M, Color: Black"
}
```

## 7. Search & Filter Enhancement

- Index variant attributes for search
- Filter by attribute values (e.g., "Show all Size M")
- Price range considers variant prices
