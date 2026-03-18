from flask import Blueprint, jsonify, request, session
import threading
from src.models.user import User, db
from functools import wraps

user_bp = Blueprint('user', __name__)

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({'error': 'Authentication required'}), 401
        return f(*args, **kwargs)
    return decorated_function

@user_bp.route('/register', methods=['POST'])
def register():
    try:
        data = request.json
        
        # Check if user already exists
        if User.query.filter_by(username=data['username']).first():
            return jsonify({'error': 'Username already exists'}), 400
        
        if User.query.filter_by(email=data['email']).first():
            return jsonify({'error': 'Email already exists'}), 400
        
        # Create new user
        user = User(
            username=data['username'], 
            email=data['email'],
            company_name=data.get('company_name'),
            phone=data.get('phone')
        )
        user.set_password(data['password'])
        
        db.session.add(user)
        db.session.commit()

        # Send welcome email in background thread (truly non-blocking)
        try:
            from src.utils.email import send_welcome_email
            _u = user
            threading.Thread(target=send_welcome_email, args=(_u,), daemon=True).start()
        except Exception as _email_err:
            print(f"[EMAIL] Welcome email failed: {_email_err}")

        # Log user in
        session['user_id'] = user.id

        return jsonify({
            'message': 'Registration successful',
            'user': user.to_dict()
        }), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@user_bp.route('/login', methods=['POST'])
def login():
    try:
        data = request.json
        user = User.query.filter_by(username=data['username']).first()
        
        if user and user.check_password(data['password']):
            session['user_id'] = user.id
            return jsonify({
                'message': 'Login successful',
                'user': user.to_dict()
            }), 200
        else:
            return jsonify({'error': 'Invalid username or password'}), 401
            
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@user_bp.route('/logout', methods=['POST'])
def logout():
    session.pop('user_id', None)
    return jsonify({'message': 'Logout successful'}), 200

@user_bp.route('/me', methods=['GET'])
@login_required
def get_current_user():
    user = User.query.get(session['user_id'])
    return jsonify(user.to_dict())

@user_bp.route('/users', methods=['GET'])
@login_required
def get_users():
    users = User.query.all()
    return jsonify([user.to_dict() for user in users])

@user_bp.route('/users/<int:user_id>', methods=['GET'])
@login_required
def get_user(user_id):
    user = User.query.get_or_404(user_id)
    return jsonify(user.to_dict())

@user_bp.route('/users/<int:user_id>', methods=['PUT'])
@login_required
def update_user(user_id):
    user = User.query.get_or_404(user_id)
    data = request.json
    user.username = data.get('username', user.username)
    user.email = data.get('email', user.email)
    user.company_name = data.get('company_name', user.company_name)
    user.phone = data.get('phone', user.phone)
    user.shipping_address = data.get('shipping_address', user.shipping_address)
    user.billing_address = data.get('billing_address', user.billing_address)
    db.session.commit()
    return jsonify(user.to_dict())

@user_bp.route('/users/<int:user_id>', methods=['DELETE'])
@login_required
def delete_user(user_id):
    user = User.query.get_or_404(user_id)
    db.session.delete(user)
    db.session.commit()
    return '', 204


@user_bp.route('/auth/change-password', methods=['POST'])
@login_required
def change_password():
    """Allow a logged-in customer to change their own password."""
    data = request.json or {}
    current_password = data.get('current_password', '')
    new_password = data.get('new_password', '')

    if not current_password or not new_password:
        return jsonify({'error': 'Both current and new password are required'}), 400
    if len(new_password) < 6:
        return jsonify({'error': 'New password must be at least 6 characters'}), 400

    user = User.query.get(session['user_id'])
    if not user or not user.check_password(current_password):
        return jsonify({'error': 'Current password is incorrect'}), 400

    user.set_password(new_password)
    db.session.commit()

    # Send password changed security notification
    try:
        from src.utils.email import send_password_changed_email
        send_password_changed_email(user, account_type='customer')
    except Exception as _email_err:
        print(f"[EMAIL] Password-changed notification failed: {_email_err}")

    return jsonify({'message': 'Password updated successfully'}), 200
