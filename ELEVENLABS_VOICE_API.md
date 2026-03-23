# ElevenLabs Voice Agent — API Setup Guide

## Step 1 — Set the Secret on Railway

In your Railway project → **Variables**, add:

```
ELEVENLABS_VOICE_SECRET = vs_live_0a9ebe618a4e4894cc5b829d2beed2ac80aec2c3f6f286d7ea22cde13659eabe
```

> You can use any long random string. Generate a new one with:
> `python3 -c "import secrets; print('vs_live_' + secrets.token_hex(32))"`

---

## Step 2 — Add Tools in ElevenLabs

In your ElevenLabs agent → **Tools tab** → **Add Tool** → **Webhook**

For every tool, set the **Custom Header**:
- Header name: `X-Voice-Secret`
- Header value: `vs_live_0a9ebe618a4e4894cc5b829d2beed2ac80aec2c3f6f286d7ea22cde13659eabe`

Base URL: `https://rs-lld-website-production.up.railway.app`

---

### Tool 1 — `get_customer`

| Field | Value |
|-------|-------|
| Name | `get_customer` |
| Method | `POST` |
| URL | `https://rs-lld-website-production.up.railway.app/api/voice/get_customer` |
| Description | Look up a registered customer by their phone number. Call this at the start of every conversation to identify the caller. |

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `phone_number` | string | Yes | Caller's phone number in E.164 format, e.g. `+17735551234` |

**Example response:**
```json
{
  "success": true,
  "found": true,
  "customer": {
    "name": "John Smith",
    "company": "Smith's Diner",
    "email": "john@smithsdiner.com",
    "phone": "+17735551234",
    "recent_orders": [
      { "order_number": "RS-2026-AB1C", "status": "delivered", "total": 54.97, "date": "2026-03-10" }
    ]
  }
}
```

---

### Tool 2 — `get_products`

| Field | Value |
|-------|-------|
| Name | `get_products` |
| Method | `POST` |
| URL | `https://rs-lld-website-production.up.railway.app/api/voice/get_products` |
| Description | Search the product catalog by keyword, category, or list all in-stock items. Use this when a customer asks about available products or prices. |

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `query` | string | No | Keyword to search (name, brand, or SKU) |
| `category` | string | No | Filter by category name, e.g. `Disposables` |
| `in_stock_only` | boolean | No | Default `true` — only return in-stock items |

**Example response:**
```json
{
  "success": true,
  "count": 3,
  "products": [
    {
      "sku": "GLV-MED-BLK",
      "name": "Black Nitrile Gloves Medium",
      "brand": "SafeHands",
      "unit_size": "100/box",
      "unit_price": 12.99,
      "bulk_price": 10.99,
      "bulk_quantity": 10,
      "in_stock": true,
      "stock_quantity": 48
    }
  ]
}
```

---

### Tool 3 — `place_order`

| Field | Value |
|-------|-------|
| Name | `place_order` |
| Method | `POST` |
| URL | `https://rs-lld-website-production.up.railway.app/api/voice/place_order` |
| Description | Place a confirmed order for the customer. Only call this AFTER the customer has verbally confirmed the items and quantities. Read back the full order summary before calling. |

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `phone_number` | string | Yes | Caller's phone number in E.164 format |
| `items` | array | Yes | List of `{ "sku": "GLV-MED-BLK", "qty": 3 }` objects |
| `confirmed` | boolean | Yes | Must be `true` — only set after verbal confirmation |
| `special_notes` | string | No | Any delivery notes from the customer |
| `payment_method` | string | No | `net30` (default), `net15`, `cod`, `check` |

**Example response:**
```json
{
  "success": true,
  "order_number": "RS-2026-XY7Z",
  "total": 54.97,
  "items_placed": 2,
  "message": "Order RS-2026-XY7Z placed successfully for John Smith. Total: $54.97"
}
```

---

### Tool 4 — `check_order_status`

| Field | Value |
|-------|-------|
| Name | `check_order_status` |
| Method | `POST` |
| URL | `https://rs-lld-website-production.up.railway.app/api/voice/check_order_status` |
| Description | Check the status of an order by order number or by phone number (returns the most recent order). Use this when a customer asks about their order. |

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `order_number` | string | No | Order number, e.g. `RS-2026-AB1C` |
| `phone_number` | string | No | Caller's phone — returns their most recent order |

> At least one of `order_number` or `phone_number` must be provided.

**Example response:**
```json
{
  "success": true,
  "order": {
    "order_number": "RS-2026-AB1C",
    "status": "shipped",
    "total": 54.97,
    "item_count": 2,
    "created_at": "2026-03-18",
    "items": [
      { "sku": "GLV-MED-BLK", "name": "Black Nitrile Gloves Medium", "quantity": 3, "unit_price": 12.99, "line_total": 38.97 }
    ]
  }
}
```

---

### Tool 5 — `cancel_order`

| Field | Value |
|-------|-------|
| Name | `cancel_order` |
| Method | `POST` |
| URL | `https://rs-lld-website-production.up.railway.app/api/voice/cancel_order` |
| Description | Cancel a pending or confirmed order. Only call this after the customer has verbally confirmed they want to cancel. Orders that are already packed, shipped, or delivered cannot be cancelled via voice — direct the customer to call staff. |

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `order_number` | string | Yes | Order number to cancel, e.g. `RS-2026-AB1C` |
| `phone_number` | string | No | Caller's phone — used to verify ownership |
| `confirmed` | boolean | Yes | Must be `true` — only set after verbal confirmation |

**Example response:**
```json
{
  "success": true,
  "order_number": "RS-2026-AB1C",
  "message": "Order RS-2026-AB1C has been successfully cancelled."
}
```

---

## Step 3 — Suggested Agent System Prompt

```
You are the RS LLD Restaurant Supply voice ordering assistant.
Your job is to help restaurant owners place orders, check order status, and manage their account by phone.

At the start of every call:
1. Greet the caller and ask for their phone number if you don't already have it.
2. Call get_customer with their phone number to identify them.
3. Address them by name and company once identified.

When taking an order:
1. Use get_products to look up items the customer requests.
2. Confirm each item: name, SKU, quantity, and price.
3. Read back the full order summary including total before placing.
4. Only call place_order after the customer says "yes, confirm" or equivalent.

When cancelling an order:
1. Ask for the order number or use their phone to look up the most recent order.
2. Confirm the order details and ask "Are you sure you want to cancel order [number]?"
3. Only call cancel_order after explicit verbal confirmation.

Always be professional, concise, and confirm important details before taking action.
```

---

## Order Status Reference

| Status | Meaning |
|--------|---------|
| `pending` | Order received, awaiting staff confirmation |
| `confirmed` | Staff confirmed the order |
| `packed` | Order is being packed |
| `shipped` | Order is on its way |
| `delivered` | Order delivered |
| `cancelled` | Order cancelled |
