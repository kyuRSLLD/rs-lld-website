# LLD Restaurant Supply — Inventory & Product Management API

**Version:** 1.0  
**Base URL:** `https://lldrestaurantsupply.com/api`  
**Authentication:** API Key via `X-API-Key` header

---

## Authentication

Every request (except the health check) requires an API key passed in the request header:

```
X-API-Key: your-api-key-here
```

The API key is set via the `INVENTORY_API_KEY` environment variable on the server. Contact your administrator for the key.

**Unauthorized response (401):**
```json
{ "error": "Missing API key. Pass X-API-Key header." }
```

**Forbidden response (403):**
```json
{ "error": "Invalid API key." }
```

---

## Endpoints Overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/health` | Health check (no auth required) |
| `GET` | `/api/v1/products` | List all products |
| `GET` | `/api/v1/products/{id_or_sku}` | Get a single product |
| `PUT` | `/api/v1/products/{id_or_sku}` | Update any product fields |
| `PATCH` | `/api/v1/products/{id_or_sku}/price` | Update pricing only |
| `PATCH` | `/api/v1/products/{id_or_sku}/inventory` | Update stock status only |
| `POST` | `/api/v1/products/{id_or_sku}/image` | Upload a product image |
| `POST` | `/api/v1/products/bulk-update` | Bulk update multiple products |
| `GET` | `/api/v1/categories` | List all categories |

**Note:** `{id_or_sku}` accepts either the numeric product ID (e.g., `1`) or the SKU string (e.g., `VG-M-100`).

---

## Endpoints

### GET `/api/v1/health`

Health check — no authentication required.

**Response:**
```json
{
  "status": "ok",
  "service": "LLD Restaurant Supply Inventory API",
  "version": "1.0"
}
```

---

### GET `/api/v1/products`

List all products with optional filtering and pagination.

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `category_id` | integer | Filter by category ID |
| `search` | string | Search by name, SKU, or brand |
| `in_stock` | boolean | Filter by stock status (`true` or `false`) |
| `page` | integer | Page number (default: `1`) |
| `per_page` | integer | Items per page (default: `50`, max: `200`) |

**Example Request:**
```bash
curl -H "X-API-Key: your-key" \
  "https://lldrestaurantsupply.com/api/v1/products?category_id=1&in_stock=true&per_page=20"
```

**Response:**
```json
{
  "total": 38,
  "page": 1,
  "per_page": 20,
  "pages": 2,
  "products": [
    {
      "id": 1,
      "name": "Vinyl Gloves - Medium (100ct)",
      "description": null,
      "category_id": 1,
      "category_name": "Disposable Goods",
      "sku": "VG-M-100",
      "unit_price": 8.99,
      "bulk_price": 7.49,
      "bulk_quantity": 10,
      "unit_size": "100 count",
      "brand": "SafeGuard",
      "in_stock": true,
      "image_url": null,
      "created_at": "2024-01-01T00:00:00",
      "updated_at": "2024-01-01T00:00:00"
    }
  ]
}
```

---

### GET `/api/v1/products/{id_or_sku}`

Get a single product by its numeric ID or SKU.

**Example Requests:**
```bash
# By SKU
curl -H "X-API-Key: your-key" \
  "https://lldrestaurantsupply.com/api/v1/products/VG-M-100"

# By ID
curl -H "X-API-Key: your-key" \
  "https://lldrestaurantsupply.com/api/v1/products/1"
```

**Response:** Single product object (same structure as above).

**Not found (404):**
```json
{ "error": "Product 'XYZ' not found" }
```

---

### PATCH `/api/v1/products/{id_or_sku}/price`

Update pricing for a product. Only the fields you include will be changed.

**Request Body (JSON):**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `unit_price` | float | No | New unit/retail price |
| `bulk_price` | float | No | New bulk/case price (set to `null` to remove) |
| `bulk_quantity` | integer | No | Minimum quantity for bulk price (set to `null` to remove) |

**Example Request:**
```bash
curl -X PATCH \
  -H "X-API-Key: your-key" \
  -H "Content-Type: application/json" \
  -d '{"unit_price": 9.99, "bulk_price": 8.49, "bulk_quantity": 10}' \
  "https://lldrestaurantsupply.com/api/v1/products/VG-M-100/price"
```

**Response:**
```json
{
  "success": true,
  "product": { ...updated product object... }
}
```

---

### PATCH `/api/v1/products/{id_or_sku}/inventory`

Update the stock status of a product.

**Request Body (JSON):**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `in_stock` | boolean | Yes | `true` = in stock, `false` = out of stock |

**Example Request:**
```bash
curl -X PATCH \
  -H "X-API-Key: your-key" \
  -H "Content-Type: application/json" \
  -d '{"in_stock": false}' \
  "https://lldrestaurantsupply.com/api/v1/products/VG-M-100/inventory"
```

**Response:**
```json
{
  "success": true,
  "product": { ...updated product object... }
}
```

---

### PUT `/api/v1/products/{id_or_sku}`

Full or partial update of any product fields. All fields are optional — only the fields you include will be updated.

**Request Body (JSON):**

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Product name |
| `description` | string | Product description |
| `category_id` | integer | Category ID (must exist) |
| `sku` | string | SKU (must be unique) |
| `unit_price` | float | Unit/retail price |
| `bulk_price` | float | Bulk/case price |
| `bulk_quantity` | integer | Minimum quantity for bulk price |
| `unit_size` | string | Unit size (e.g., "100 count", "5 lb") |
| `brand` | string | Brand name |
| `in_stock` | boolean | Stock status |
| `image_url` | string | URL of product image |

**Example Request:**
```bash
curl -X PUT \
  -H "X-API-Key: your-key" \
  -H "Content-Type: application/json" \
  -d '{
    "unit_price": 10.99,
    "brand": "NewBrand",
    "in_stock": true,
    "description": "Updated description"
  }' \
  "https://lldrestaurantsupply.com/api/v1/products/VG-M-100"
```

---

### POST `/api/v1/products/{id_or_sku}/image`

Upload a product image. The image is stored on the server and the product's `image_url` is updated automatically.

**Request:** `multipart/form-data`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `image` | file | Yes | Image file (PNG, JPG, JPEG, GIF, WEBP — max 5MB) |

**Example Request:**
```bash
curl -X POST \
  -H "X-API-Key: your-key" \
  -F "image=@/path/to/product-photo.jpg" \
  "https://lldrestaurantsupply.com/api/v1/products/VG-M-100/image"
```

**Response:**
```json
{
  "success": true,
  "image_url": "/uploads/products/vg-m-100_a1b2c3d4.jpg",
  "product": { ...updated product object... }
}
```

The `image_url` is a relative path served from the same domain:  
`https://lldrestaurantsupply.com/uploads/products/vg-m-100_a1b2c3d4.jpg`

---

### POST `/api/v1/products/bulk-update`

Update multiple products in a single request. Ideal for syncing prices from a spreadsheet or external system.

**Request Body (JSON):**

```json
{
  "products": [
    {
      "sku": "VG-M-100",
      "unit_price": 8.99,
      "bulk_price": 7.49,
      "in_stock": true
    },
    {
      "sku": "VG-L-100",
      "unit_price": 9.49,
      "in_stock": false
    },
    {
      "id": 5,
      "unit_price": 22.99,
      "brand": "Dart"
    }
  ]
}
```

Each item in the array must have either `id` or `sku`. All other fields are optional.

**Supported fields per item:** `unit_price`, `bulk_price`, `bulk_quantity`, `in_stock`, `name`, `description`, `brand`, `unit_size`, `image_url`

**Response:**
```json
{
  "success": true,
  "updated_count": 2,
  "skipped_count": 1,
  "error_count": 0,
  "updated": [
    { "identifier": "VG-M-100", "sku": "VG-M-100", "name": "Vinyl Gloves - Medium (100ct)" },
    { "identifier": "VG-L-100", "sku": "VG-L-100", "name": "Vinyl Gloves - Large (100ct)" }
  ],
  "skipped": [
    { "identifier": "INVALID-SKU", "reason": "Not found" }
  ],
  "errors": []
}
```

---

### GET `/api/v1/categories`

List all product categories.

**Example Request:**
```bash
curl -H "X-API-Key: your-key" \
  "https://lldrestaurantsupply.com/api/v1/categories"
```

**Response:**
```json
{
  "categories": [
    { "id": 1, "name": "Disposable Goods", "description": "Gloves, cups, containers", "created_at": "..." },
    { "id": 2, "name": "Kitchen Tools", "description": "Knives, ladles, cutting boards", "created_at": "..." }
  ]
}
```

---

## Product Object Reference

All endpoints that return a product use this structure:

| Field | Type | Description |
|-------|------|-------------|
| `id` | integer | Unique product ID |
| `name` | string | Product name |
| `description` | string | Product description |
| `category_id` | integer | Category ID |
| `category_name` | string | Category name |
| `sku` | string | Stock Keeping Unit (unique identifier) |
| `unit_price` | float | Retail price per unit |
| `bulk_price` | float or null | Bulk/case price |
| `bulk_quantity` | integer or null | Minimum quantity for bulk price |
| `unit_size` | string | Size/quantity description (e.g., "100 count") |
| `brand` | string | Brand name |
| `in_stock` | boolean | Whether the item is currently in stock |
| `image_url` | string or null | Relative URL of the product image |
| `created_at` | ISO 8601 datetime | When the product was created |
| `updated_at` | ISO 8601 datetime | When the product was last updated |

---

## Error Responses

All errors follow this format:

```json
{ "error": "Description of what went wrong" }
```

| HTTP Status | Meaning |
|-------------|---------|
| `200` | Success |
| `201` | Created (image uploaded) |
| `400` | Bad request — invalid data or missing required fields |
| `401` | Unauthorized — missing API key |
| `403` | Forbidden — invalid API key |
| `404` | Not found — product or category does not exist |
| `500` | Server error |

---

## Quick Reference — Common Use Cases

### Update a single product price
```bash
curl -X PATCH -H "X-API-Key: YOUR_KEY" -H "Content-Type: application/json" \
  -d '{"unit_price": 12.99}' \
  https://lldrestaurantsupply.com/api/v1/products/VG-M-100/price
```

### Mark a product as out of stock
```bash
curl -X PATCH -H "X-API-Key: YOUR_KEY" -H "Content-Type: application/json" \
  -d '{"in_stock": false}' \
  https://lldrestaurantsupply.com/api/v1/products/VG-M-100/inventory
```

### Upload a product image
```bash
curl -X POST -H "X-API-Key: YOUR_KEY" \
  -F "image=@gloves.jpg" \
  https://lldrestaurantsupply.com/api/v1/products/VG-M-100/image
```

### Bulk update prices from a script
```bash
curl -X POST -H "X-API-Key: YOUR_KEY" -H "Content-Type: application/json" \
  -d '{
    "products": [
      {"sku": "VG-M-100", "unit_price": 8.99, "bulk_price": 7.49},
      {"sku": "VG-L-100", "unit_price": 8.99, "bulk_price": 7.49},
      {"sku": "NG-M-100", "unit_price": 13.99, "in_stock": true}
    ]
  }' \
  https://lldrestaurantsupply.com/api/v1/products/bulk-update
```

---

## Setting the API Key on the Server

Set the `INVENTORY_API_KEY` environment variable before starting the backend:

```bash
export INVENTORY_API_KEY="your-secure-api-key-here"
python3 src/main.py
```

On Railway, add it under **Variables** in your project settings.

The default key (if not set) is `lld-inventory-api-key-2024` — **change this in production**.
