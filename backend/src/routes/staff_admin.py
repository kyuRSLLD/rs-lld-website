from flask import Blueprint, request, jsonify, session
from src.models.user import db
from src.models.order import StaffUser
from src.routes.order import staff_required, get_current_staff_id

staff_admin_bp = Blueprint('staff_admin', __name__)


def admin_required(f):
    """Decorator: requires staff login AND admin role."""
    from functools import wraps
    @wraps(f)
    def decorated(*args, **kwargs):
        # Support JWT token auth (cross-domain) and session cookie auth
        from src.routes.order import _verify_staff_jwt
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
        if not staff or staff.role != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        return f(*args, **kwargs)
    return decorated


# ─── List all staff users ─────────────────────────────────────────────────────

@staff_admin_bp.route('/staff/users', methods=['GET'])
@admin_required
def list_staff_users():
    users = StaffUser.query.order_by(StaffUser.created_at.asc()).all()
    return jsonify([u.to_dict() for u in users])


# ─── Create a new staff user ──────────────────────────────────────────────────

@staff_admin_bp.route('/staff/users', methods=['POST'])
@admin_required
def create_staff_user():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    username = data.get('username', '').strip()
    email = data.get('email', '').strip()
    password = data.get('password', '').strip()
    role = data.get('role', 'staff')
    full_name = data.get('full_name', '').strip()

    if not username:
        return jsonify({'error': 'Username is required'}), 400
    if not password or len(password) < 6:
        return jsonify({'error': 'Password must be at least 6 characters'}), 400
    if role not in ('staff', 'manager', 'admin'):
        return jsonify({'error': 'Invalid role. Must be staff, manager, or admin'}), 400

    if StaffUser.query.filter_by(username=username).first():
        return jsonify({'error': f"Username '{username}' is already taken"}), 409
    if email and StaffUser.query.filter_by(email=email).first():
        return jsonify({'error': f"Email '{email}' is already in use"}), 409

    user = StaffUser(
        username=username,
        email=email or f'{username}@lldrestaurantsupply.com',
        full_name=full_name or None,
        role=role,
        is_active=True,
    )
    user.set_password(password)
    db.session.add(user)
    db.session.commit()
    return jsonify(user.to_dict()), 201


# ─── Update a staff user ──────────────────────────────────────────────────────

@staff_admin_bp.route('/staff/users/<int:user_id>', methods=['PUT'])
@admin_required
def update_staff_user(user_id):
    user = StaffUser.query.get_or_404(user_id)
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    # Prevent admin from demoting themselves
    current_id = get_current_staff_id()
    if user_id == current_id and data.get('role') and data['role'] != 'admin':
        return jsonify({'error': 'You cannot change your own role'}), 400
    if user_id == current_id and data.get('is_active') is False:
        return jsonify({'error': 'You cannot deactivate your own account'}), 400

    if 'full_name' in data:
        user.full_name = data['full_name'].strip() or None
    if 'email' in data:
        new_email = data['email'].strip()
        if new_email and new_email != user.email:
            if StaffUser.query.filter_by(email=new_email).first():
                return jsonify({'error': f"Email '{new_email}' is already in use"}), 409
            user.email = new_email
    if 'role' in data:
        if data['role'] not in ('staff', 'manager', 'admin'):
            return jsonify({'error': 'Invalid role'}), 400
        user.role = data['role']
    if 'is_active' in data:
        user.is_active = bool(data['is_active'])
    if data.get('password'):
        if len(data['password']) < 6:
            return jsonify({'error': 'Password must be at least 6 characters'}), 400
        user.set_password(data['password'])

    db.session.commit()
    return jsonify(user.to_dict())


# ─── Delete a staff user ──────────────────────────────────────────────────────

@staff_admin_bp.route('/staff/users/<int:user_id>', methods=['DELETE'])
@admin_required
def delete_staff_user(user_id):
    current_id = get_current_staff_id()
    if user_id == current_id:
        return jsonify({'error': 'You cannot delete your own account'}), 400

    user = StaffUser.query.get_or_404(user_id)
    db.session.delete(user)
    db.session.commit()
    return jsonify({'message': f"Staff user '{user.username}' deleted"})
