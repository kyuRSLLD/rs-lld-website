"""
API Key management routes — admin only.

Endpoints:
  GET    /api/admin/keys           — list all keys (no raw values)
  POST   /api/admin/keys           — create a new key (returns raw key ONCE)
  DELETE /api/admin/keys/<id>      — revoke (soft-delete) a key
  DELETE /api/admin/keys/<id>/hard — permanently delete a key record
  POST   /api/admin/keys/verify    — verify a raw key (for integration testing)
"""

from datetime import datetime
from flask import Blueprint, jsonify, request, session
from functools import wraps

from src.models.user import db
from src.models.api_key import APIKey, generate_api_key, hash_api_key, KEY_PREFIXES

api_keys_bp = Blueprint('api_keys', __name__)


# ── Admin-required decorator ──────────────────────────────────────────────────

def admin_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        from src.models.order import StaffUser
        from src.routes.order import _verify_staff_jwt, get_current_staff_id
        # Support JWT token auth (cross-domain) and session cookie auth
        auth_header = request.headers.get('Authorization', '')
        if auth_header.startswith('Bearer '):
            token = auth_header[7:]
            staff_id = _verify_staff_jwt(token)
            if not staff_id:
                return jsonify({'error': 'Invalid or expired token'}), 401
            from flask import g
            g.staff_id = staff_id
        else:
            staff_id = session.get('staff_id')
            if not staff_id:
                return jsonify({'error': 'Authentication required'}), 401
        staff = StaffUser.query.get(staff_id)
        if not staff or not staff.is_active:
            return jsonify({'error': 'Account inactive'}), 403
        if staff.role != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        return f(*args, **kwargs)
    return decorated


# ── List all keys ─────────────────────────────────────────────────────────────

@api_keys_bp.route('/admin/keys', methods=['GET'])
@admin_required
def list_keys():
    """Return all API keys (previews only, never raw values)."""
    keys = APIKey.query.order_by(APIKey.created_at.desc()).all()
    return jsonify([k.to_dict() for k in keys])


# ── Create a new key ──────────────────────────────────────────────────────────

@api_keys_bp.route('/admin/keys', methods=['POST'])
@admin_required
def create_key():
    """
    Create a new API key. The raw key is returned ONCE in this response.
    It is never stored in plaintext and cannot be retrieved again.
    """
    from src.models.order import StaffUser
    data = request.json or {}

    name = (data.get('name') or '').strip()
    prefix = (data.get('prefix') or '').strip()
    description = (data.get('description') or '').strip()
    expires_at_str = (data.get('expires_at') or '').strip()

    if not name:
        return jsonify({'error': 'Key name is required'}), 400
    if prefix not in KEY_PREFIXES:
        return jsonify({'error': f'Invalid prefix. Must be one of: {", ".join(KEY_PREFIXES)}'}), 400

    # Parse optional expiry
    expires_at = None
    if expires_at_str:
        try:
            expires_at = datetime.fromisoformat(expires_at_str)
        except ValueError:
            return jsonify({'error': 'Invalid expires_at format. Use ISO 8601 (YYYY-MM-DD)'}), 400

    # Generate the key
    raw_key, key_hash, key_preview = generate_api_key(prefix)

    # Ensure hash uniqueness (astronomically unlikely collision, but check anyway)
    if APIKey.query.filter_by(key_hash=key_hash).first():
        return jsonify({'error': 'Key collision — please try again'}), 500

    from src.routes.order import get_current_staff_id
    staff = StaffUser.query.get(get_current_staff_id())
    api_key = APIKey(
        name=name,
        prefix=prefix,
        key_hash=key_hash,
        key_preview=key_preview,
        description=description or None,
        is_active=True,
        created_by=staff.username,
        expires_at=expires_at,
    )
    db.session.add(api_key)
    db.session.commit()

    # Return the raw key ONCE — it will never be retrievable again
    result = api_key.to_dict()
    result['raw_key'] = raw_key   # shown once, not stored
    result['warning'] = 'Copy this key now. It will never be shown again.'
    return jsonify(result), 201


# ── Revoke a key (soft delete) ────────────────────────────────────────────────

@api_keys_bp.route('/admin/keys/<int:key_id>/revoke', methods=['POST'])
@admin_required
def revoke_key(key_id):
    """Deactivate a key without deleting the audit record."""
    from src.models.order import StaffUser
    api_key = APIKey.query.get_or_404(key_id)
    if not api_key.is_active:
        return jsonify({'error': 'Key is already revoked'}), 400

    from src.routes.order import get_current_staff_id
    staff = StaffUser.query.get(get_current_staff_id())
    api_key.is_active = False
    api_key.revoked_at = datetime.utcnow()
    api_key.revoked_by = staff.username
    db.session.commit()
    return jsonify({'success': True, 'key': api_key.to_dict()})


# ── Re-activate a revoked key ─────────────────────────────────────────────────

@api_keys_bp.route('/admin/keys/<int:key_id>/activate', methods=['POST'])
@admin_required
def activate_key(key_id):
    """Re-activate a previously revoked key."""
    api_key = APIKey.query.get_or_404(key_id)
    api_key.is_active = True
    api_key.revoked_at = None
    api_key.revoked_by = None
    db.session.commit()
    return jsonify({'success': True, 'key': api_key.to_dict()})


# ── Permanently delete a key record ──────────────────────────────────────────

@api_keys_bp.route('/admin/keys/<int:key_id>', methods=['DELETE'])
@admin_required
def delete_key(key_id):
    """Permanently remove a key record from the database."""
    api_key = APIKey.query.get_or_404(key_id)
    db.session.delete(api_key)
    db.session.commit()
    return jsonify({'success': True})


# ── Verify a raw key (for integration testing / middleware use) ───────────────

@api_keys_bp.route('/admin/keys/verify', methods=['POST'])
@admin_required
def verify_key():
    """
    Check whether a raw key is valid (active, not expired).
    Useful for testing integrations from the admin panel.
    """
    data = request.json or {}
    raw_key = (data.get('raw_key') or '').strip()
    if not raw_key:
        return jsonify({'error': 'raw_key is required'}), 400

    key_hash = hash_api_key(raw_key)
    api_key = APIKey.query.filter_by(key_hash=key_hash).first()
    if not api_key:
        return jsonify({'valid': False, 'reason': 'Key not found'}), 200

    # Update last_used_at and use_count
    api_key.last_used_at = datetime.utcnow()
    api_key.use_count += 1
    db.session.commit()

    if not api_key.is_active:
        return jsonify({'valid': False, 'reason': 'Key has been revoked', 'key': api_key.to_dict()}), 200
    if api_key.is_expired():
        return jsonify({'valid': False, 'reason': 'Key has expired', 'key': api_key.to_dict()}), 200

    return jsonify({'valid': True, 'key': api_key.to_dict()}), 200


# ── Public middleware helper (for use by other routes) ────────────────────────

def authenticate_api_key(raw_key: str):
    """
    Validate an API key passed in a request header.
    Returns (api_key_object, error_message).
    Call this from any route that accepts API key auth.

    Usage:
        key_obj, err = authenticate_api_key(request.headers.get('X-API-Key', ''))
        if err:
            return jsonify({'error': err}), 401
    """
    if not raw_key:
        return None, 'Missing X-API-Key header'
    key_hash = hash_api_key(raw_key)
    api_key = APIKey.query.filter_by(key_hash=key_hash).first()
    if not api_key:
        return None, 'Invalid API key'
    if not api_key.is_active:
        return None, 'API key has been revoked'
    if api_key.is_expired():
        return None, 'API key has expired'
    # Track usage
    api_key.last_used_at = datetime.utcnow()
    api_key.use_count += 1
    db.session.commit()
    return api_key, None
