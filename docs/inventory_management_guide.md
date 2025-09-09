# RS LLD Inventory Management System

## Current System Overview

Your website uses **SQLite database** with Flask-SQLAlchemy for inventory management. This is a simple, reliable system perfect for small to medium-sized operations.

### Database Structure

**Categories Table:**
- ID, Name, Description, Created Date

**Products Table:**
- ID, Name, Description, Category
- **SKU** (Stock Keeping Unit) - Unique identifier
- **Unit Price** - Regular price per unit
- **Bulk Price** - Discounted price for bulk orders
- **Bulk Quantity** - Minimum quantity for bulk pricing
- **Unit Size** - Size description (e.g., "28 oz", "50 lb")
- **Brand** - Product brand
- **In Stock** - Availability status
- **Image URL** - Product image link

## Current Sample Inventory

Your system currently has these sample products:

### Canned Goods
- Diced Tomatoes - 28oz Can (SKU: DT-28) - $2.49 ($2.19 bulk/24+)
- Black Beans - 15oz Can (SKU: BB-15) - $1.89 ($1.69 bulk/24+)

### Dry Ingredients  
- All-Purpose Flour - 50lb Bag (SKU: APF-50) - $18.99 ($16.99 bulk/10+)
- Long Grain Rice - 25lb Bag (SKU: LGR-25) - $15.49 ($13.99 bulk/8+)

### Condiments & Sauces
- Olive Oil - 1 Gallon (SKU: OO-1G) - $24.99 ($22.49 bulk/6+)
- Ketchup - 32oz Bottle (SKU: K-32) - $3.99 ($3.49 bulk/12+)

### Cleaning Supplies
- Commercial Degreaser - 1 Gallon (SKU: CD-1G) - $12.99 ($11.49 bulk/4+)

### Paper Products
- Paper Towels - 12 Roll Pack (SKU: PT-12) - $18.99 ($16.99 bulk/6+)

## How to Update Your Inventory

### Method 1: API Endpoints (Recommended for Integration)

**Add New Product:**
```bash
curl -X POST https://lnh8imcw0qzl.manus.space/api/admin/products \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "Premium Pasta Sauce - 24oz Jar",
    "description": "Rich tomato sauce with herbs",
    "category_id": 3,
    "sku": "PPS-24",
    "unit_price": 4.99,
    "bulk_price": 4.49,
    "bulk_quantity": 12,
    "unit_size": "24 oz",
    "brand": "Rao's",
    "image_url": "https://example.com/pasta-sauce.jpg"
  }'
```

**Add New Category:**
```bash
curl -X POST https://lnh8imcw0qzl.manus.space/api/admin/categories \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "Frozen Foods",
    "description": "Frozen vegetables, proteins, and prepared items"
  }'
```

### Method 2: Direct Database Access

**View Current Products:**
```bash
sqlite3 /path/to/database/app.db "SELECT * FROM product;"
```

**Add Product via SQL:**
```sql
INSERT INTO product (name, category_id, sku, unit_price, bulk_price, bulk_quantity, unit_size, brand, in_stock)
VALUES ('New Product Name', 1, 'NEW-SKU', 9.99, 8.99, 10, '1 lb', 'Brand Name', 1);
```

### Method 3: Python Script (Easiest for Bulk Updates)

I can create a simple Python script for you to manage inventory easily.

## Best Practices for SKU Management

### SKU Naming Convention
- **Format:** `[CATEGORY]-[SIZE/TYPE]-[VARIANT]`
- **Examples:**
  - `DT-28` = Diced Tomatoes, 28oz
  - `APF-50` = All-Purpose Flour, 50lb
  - `OO-1G` = Olive Oil, 1 Gallon

### Pricing Strategy
- **Unit Price:** Regular retail price
- **Bulk Price:** 10-15% discount for volume orders
- **Bulk Quantity:** Set minimum quantities that make sense for your margins

### Inventory Status
- Use `in_stock` field to control product visibility
- Set to `false` to temporarily hide out-of-stock items

## Integration Options

### For Advanced Users
- **ERP Integration:** Connect with QuickBooks, SAP, or other systems
- **CSV Import/Export:** Bulk update via spreadsheet
- **Barcode Scanning:** Add barcode field for warehouse management
- **Real-time Inventory:** Connect with POS systems

### For Simple Management
- **Admin Dashboard:** I can build a web interface for easy product management
- **Spreadsheet Sync:** Regular CSV uploads to update inventory
- **Email Notifications:** Alerts for low stock levels

## Next Steps

Would you like me to:
1. **Create an admin dashboard** for easy inventory management?
2. **Build a CSV import tool** for bulk product updates?
3. **Set up automated inventory sync** with your existing systems?
4. **Add more sample products** to specific categories?

Let me know what approach works best for your business needs!

