"""
Staff Portal Customer Sync
===========================
Syncs customer profile data from the website (voice calls, web orders)
to the staff portal's customer/restaurant/order tables via HTTP REST API.

The staff portal exposes REST endpoints at /api/voice-sync/* that accept
JSON payloads and are authenticated with the X-Voice-Secret header.

Environment variables:
    STAFF_PORTAL_URL        — Base URL of the staff portal
                              e.g. https://lld-staff-portal.manus.app
    STAFF_PORTAL_SYNC_SECRET — Shared secret for X-Voice-Secret header

If either env var is not set, all sync operations are no-ops
(graceful degradation — the voice API still works, just no staff portal sync).
"""

import os
import re
import threading
import requests
from datetime import datetime


def _get_config():
    """Return (base_url, secret) or (None, None) if not configured."""
    base_url = os.environ.get('STAFF_PORTAL_URL', '').rstrip('/')
    secret = os.environ.get('STAFF_PORTAL_SYNC_SECRET', '')
    if not base_url or not secret:
        return None, None
    return base_url, secret


def _normalize_phone_e164(phone: str) -> str:
    """Normalize phone to E.164 format (+1XXXXXXXXXX for US numbers)."""
    if not phone:
        return ''
    digits = re.sub(r'\D', '', phone)
    if len(digits) == 10:
        return f'+1{digits}'
    if len(digits) == 11 and digits[0] == '1':
        return f'+{digits}'
    if phone.startswith('+'):
        return phone
    return f'+{digits}' if digits else ''


def _post(endpoint: str, payload: dict) -> dict | None:
    """POST to a staff portal sync endpoint. Returns response JSON or None."""
    base_url, secret = _get_config()
    if not base_url:
        return None
    try:
        url = f'{base_url}/api/voice-sync/{endpoint}'
        resp = requests.post(
            url,
            json=payload,
            headers={
                'Content-Type': 'application/json',
                'X-Voice-Secret': secret,
            },
            timeout=10,
        )
        if resp.status_code == 200:
            return resp.json()
        else:
            print(f'[StaffSync] {endpoint} returned {resp.status_code}: {resp.text[:200]}')
            return None
    except Exception as e:
        print(f'[StaffSync] {endpoint} failed: {e}')
        return None


def upsert_customer_profile(
    phone: str,
    name: str = None,
    email: str = None,
    preferred_language: str = 'en',
    payment_terms: str = 'credit_card',
    approved_for_terms: bool = False,
    notes: str = None,
    source: str = 'phone',
) -> int | None:
    """
    Create or update a customer profile in the staff portal.
    Phone number is the unique identifier (E.164 format).
    Returns the customer ID or None on failure.
    """
    phone_e164 = _normalize_phone_e164(phone)
    if not phone_e164:
        return None

    payload = {
        'phone': phone_e164,
        'source': source,
    }
    if name:
        payload['name'] = name
    if email:
        payload['email'] = email
    if preferred_language:
        payload['preferred_language'] = preferred_language
    if payment_terms:
        payload['payment_terms'] = payment_terms
    if approved_for_terms:
        payload['approved_for_terms'] = True
    if notes:
        payload['notes'] = notes

    result = _post('upsert-customer', payload)
    return result.get('customer_id') if result else None


def upsert_restaurant(
    phone: str = None,
    customer_id: int = None,
    name: str = None,
    address: str = None,
    city: str = None,
    state: str = None,
    zip_code: str = None,
    delivery_instructions: str = None,
    is_primary: bool = True,
) -> int | None:
    """
    Create or update a restaurant for a customer in the staff portal.
    Returns the restaurant ID or None on failure.
    """
    phone_e164 = _normalize_phone_e164(phone) if phone else None

    payload = {
        'restaurant_name': name or 'Unknown Restaurant',
        'is_primary': is_primary,
    }
    if phone_e164:
        payload['phone'] = phone_e164
    if customer_id:
        payload['customer_id'] = customer_id
    if address:
        payload['address'] = address
    if city:
        payload['city'] = city
    if state:
        payload['state'] = state
    if zip_code:
        payload['zip'] = zip_code
    if delivery_instructions:
        payload['delivery_instructions'] = delivery_instructions

    result = _post('upsert-restaurant', payload)
    return result.get('restaurant_id') if result else None


def sync_order_to_staff_portal(
    order_number: str,
    phone: str = None,
    customer_id: int = None,
    restaurant_id: int = None,
    source_channel: str = 'phone',
    status: str = 'pending',
    payment_method: str = 'credit_card',
    payment_status: str = 'pending',
    subtotal: float = 0.0,
    tax: float = 0.0,
    total: float = 0.0,
    delivery_address: str = None,
    notes: str = None,
    items: list = None,
) -> int | None:
    """
    Sync an order to the staff portal database.
    Returns the staff portal order ID or None on failure.
    """
    phone_e164 = _normalize_phone_e164(phone) if phone else None

    payload = {
        'order_number': order_number,
        'source_channel': source_channel,
        'status': status,
        'payment_method': payment_method,
        'payment_status': payment_status,
        'subtotal': subtotal,
        'tax': tax,
        'total': total,
    }
    if phone_e164:
        payload['phone'] = phone_e164
    if customer_id:
        payload['customer_id'] = customer_id
    if restaurant_id:
        payload['restaurant_id'] = restaurant_id
    if delivery_address:
        payload['delivery_address'] = delivery_address
    if notes:
        payload['notes'] = notes
    if items:
        payload['items'] = items

    result = _post('sync-order', payload)
    return result.get('order_id') if result else None


def sync_voice_call_customer(
    phone: str,
    transcript_text: str = None,
    order_placed: bool = False,
    order_number: str = None,
    delivery_name: str = None,
    delivery_company: str = None,
    delivery_address: str = None,
    delivery_city: str = None,
    delivery_state: str = None,
    delivery_zip: str = None,
):
    """
    Called after a voice call ends to build/update the customer profile
    with information gathered during the call.
    Runs in a background thread to not block the webhook response.
    """
    def _do_sync():
        try:
            # 1. Upsert customer profile
            name = delivery_name or delivery_company
            notes = None
            if transcript_text:
                call_date = datetime.utcnow().strftime('%Y-%m-%d %H:%M')
                notes = f'[Voice call {call_date}]'
                if order_placed:
                    notes += f' Order placed: {order_number}'

            customer_id = upsert_customer_profile(
                phone=phone,
                name=name,
                source='phone',
                notes=notes,
            )

            if not customer_id:
                return

            # 2. If we have company/delivery info, create a restaurant
            if delivery_company or delivery_address:
                restaurant_name = delivery_company or f'Restaurant ({phone})'
                upsert_restaurant(
                    customer_id=customer_id,
                    name=restaurant_name,
                    address=delivery_address,
                    city=delivery_city,
                    state=delivery_state,
                    zip_code=delivery_zip,
                    is_primary=True,
                )

        except Exception as e:
            print(f'[StaffSync] sync_voice_call_customer failed: {e}')

    thread = threading.Thread(target=_do_sync, daemon=True)
    thread.start()
