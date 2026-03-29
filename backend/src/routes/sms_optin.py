"""
SMS Opt-In API
Handles public SMS consent form submissions for A2P 10DLC compliance.
Stores opt-in records in the database and sends a confirmation SMS.
"""
from flask import Blueprint, request, jsonify
from datetime import datetime
import re

sms_optin_bp = Blueprint('sms_optin', __name__)

# ---------------------------------------------------------------------------
# Helper: normalise phone to E.164 (US only)
# ---------------------------------------------------------------------------
def _normalise_phone(raw: str) -> str | None:
    digits = re.sub(r'\D', '', raw)
    if len(digits) == 10:
        return f'+1{digits}'
    if len(digits) == 11 and digits.startswith('1'):
        return f'+{digits}'
    return None


# ---------------------------------------------------------------------------
# POST /api/sms-optin  — submit consent form
# ---------------------------------------------------------------------------
@sms_optin_bp.route('/sms-optin', methods=['POST'])
def submit_sms_optin():
    data = request.get_json(silent=True) or {}

    first_name = (data.get('first_name') or '').strip()
    last_name  = (data.get('last_name')  or '').strip()
    phone_raw  = (data.get('phone')      or '').strip()
    email      = (data.get('email')      or '').strip()
    consent    = data.get('consent', False)

    # --- Validation ---
    if not first_name:
        return jsonify({'error': 'First name is required.'}), 400
    if not phone_raw:
        return jsonify({'error': 'Phone number is required.'}), 400
    if not consent:
        return jsonify({'error': 'You must agree to receive SMS messages.'}), 400

    phone_e164 = _normalise_phone(phone_raw)
    if not phone_e164:
        return jsonify({'error': 'Please enter a valid US phone number.'}), 400

    # --- Persist to DB (best-effort; table created lazily) ---
    try:
        from ..database.connection import db
        from sqlalchemy import text
        # Create table if it doesn't exist
        db.session.execute(text("""
            CREATE TABLE IF NOT EXISTS sms_opt_ins (
                id          SERIAL PRIMARY KEY,
                first_name  VARCHAR(100) NOT NULL,
                last_name   VARCHAR(100),
                phone       VARCHAR(20)  NOT NULL,
                email       VARCHAR(200),
                consented   BOOLEAN      NOT NULL DEFAULT TRUE,
                ip_address  VARCHAR(50),
                user_agent  TEXT,
                created_at  TIMESTAMP    NOT NULL DEFAULT NOW()
            )
        """))
        db.session.execute(text("""
            INSERT INTO sms_opt_ins (first_name, last_name, phone, email, consented, ip_address, user_agent)
            VALUES (:fn, :ln, :ph, :em, :co, :ip, :ua)
        """), {
            'fn': first_name,
            'ln': last_name,
            'ph': phone_e164,
            'em': email or None,
            'co': True,
            'ip': request.remote_addr,
            'ua': request.headers.get('User-Agent', '')[:500],
        })
        db.session.commit()
    except Exception as e:
        # Log but don't fail the user-facing response
        import traceback
        print(f'[sms_optin] DB error: {e}\n{traceback.format_exc()}')

    # --- Optionally send a confirmation SMS via Twilio ---
    try:
        import os
        from twilio.rest import Client as TwilioClient
        account_sid = os.environ.get('TWILIO_ACCOUNT_SID')
        auth_token  = os.environ.get('TWILIO_AUTH_TOKEN')
        from_number = os.environ.get('TWILIO_PHONE_NUMBER')
        if account_sid and auth_token and from_number:
            client = TwilioClient(account_sid, auth_token)
            client.messages.create(
                body=(
                    f"Hi {first_name}, you've successfully opted in to receive SMS messages "
                    "from RS LLD Restaurant Supply. Reply STOP to unsubscribe at any time. "
                    "Reply HELP for help. Msg & data rates may apply."
                ),
                from_=from_number,
                to=phone_e164,
            )
    except Exception as e:
        print(f'[sms_optin] Twilio send error: {e}')

    return jsonify({
        'success': True,
        'message': (
            f"Thank you, {first_name}! You have successfully opted in to receive "
            "SMS messages from RS LLD Restaurant Supply. You will receive a confirmation text shortly."
        )
    }), 200
