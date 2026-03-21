"""
n8n Notification Utilities
===========================
Sends webhook notifications to n8n Cloud workflows.
All calls are fire-and-forget (background thread) so they never block the main request.

Environment variables:
  N8N_ORDER_WEBHOOK_URL  — Production webhook URL for the LLD Order Notifications workflow
                           e.g. https://rslldllc.app.n8n.cloud/webhook/lld-order-notification
"""

import os
import threading
import requests
from datetime import datetime


def _fire_webhook(url: str, payload: dict) -> None:
    """Send a POST request to n8n in a background thread. Silently swallows errors."""
    try:
        resp = requests.post(
            url,
            json=payload,
            timeout=10,
            headers={"Content-Type": "application/json"}
        )
        print(f"[N8N] Webhook fired → {url} | status={resp.status_code}")
    except Exception as e:
        print(f"[N8N] Webhook failed → {url} | error={e}")


def notify_order_placed(order, order_type: str = "web") -> None:
    """
    Fire the n8n Order Notifications webhook in a background thread.

    Args:
        order:      SQLAlchemy Order model instance (already committed to DB)
        order_type: 'web' for website orders, 'voice' for voice AI orders
    """
    webhook_url = os.environ.get("N8N_ORDER_WEBHOOK_URL", "")
    if not webhook_url:
        print("[N8N] N8N_ORDER_WEBHOOK_URL not set — skipping order notification")
        return

    # Build items list from order.items relationship
    items = []
    try:
        for item in (order.items or []):
            items.append({
                "product_id": getattr(item, "product_id", None),
                "name": getattr(item, "product_name", "Unknown"),
                "sku": getattr(item, "product_sku", ""),
                "quantity": getattr(item, "quantity", 1),
                "price": float(getattr(item, "unit_price", 0) or 0),
                "line_total": float(getattr(item, "line_total", 0) or 0),
            })
    except Exception as e:
        print(f"[N8N] Could not serialize order items: {e}")

    # Build delivery address string
    addr_parts = [
        getattr(order, "delivery_address", ""),
        getattr(order, "delivery_city", ""),
        getattr(order, "delivery_state", ""),
        getattr(order, "delivery_zip", ""),
    ]
    delivery_address = ", ".join(p for p in addr_parts if p) or None

    # Get customer info
    customer_name = getattr(order, "delivery_name", "Guest") or "Guest"
    customer_phone = getattr(order, "delivery_phone", "") or ""
    customer_email = ""
    try:
        if order.user_id and order.user:
            customer_email = order.user.email or ""
            if not customer_name or customer_name == "Guest":
                customer_name = order.user.username or "Guest"
    except Exception:
        pass

    payload = {
        "order_id": order.id,
        "order_number": order.order_number,
        "order_type": order_type,
        "customer_name": customer_name,
        "customer_phone": customer_phone,
        "customer_email": customer_email,
        "status": order.status or "pending",
        "payment_method": getattr(order, "payment_method", ""),
        "subtotal": float(getattr(order, "subtotal", 0) or 0),
        "delivery_fee": float(getattr(order, "delivery_fee", 0) or 0),
        "total": float(getattr(order, "total_amount", 0) or 0),
        "items": items,
        "delivery_address": delivery_address,
        "notes": getattr(order, "special_notes", "") or "",
        "stripe_payment_link": getattr(order, "stripe_payment_link", None),
        "created_at": (order.created_at or datetime.utcnow()).isoformat() + "Z",
    }

    # Fire in background thread — non-blocking
    t = threading.Thread(target=_fire_webhook, args=(webhook_url, payload), daemon=True)
    t.start()
