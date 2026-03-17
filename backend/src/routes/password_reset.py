"""
Password reset and username recovery for both staff and customer accounts.
Uses secure random tokens stored in DB with 1-hour expiry.
All emails are sent via the central src.utils.email module.
"""
import os
import secrets
from datetime import datetime, timedelta

from flask import Blueprint, request, jsonify
from src.models.user import db
from src.models.order import StaffUser
from src.models.user import User

password_reset_bp = Blueprint('password_reset', __name__)

SITE_URL = os.environ.get('SITE_URL', 'https://www.lldrestaurantsupply.com')


# ─── Staff: Forgot Password ───────────────────────────────────────────────────

@password_reset_bp.route('/staff/forgot-password', methods=['POST'])
def staff_forgot_password():
    data = request.get_json() or {}
    identifier = data.get('identifier', '').strip()

    if not identifier:
        return jsonify({'error': 'Please enter your username or email'}), 400

    user = StaffUser.query.filter(
        (StaffUser.username == identifier) | (StaffUser.email == identifier)
    ).first()

    if not user or not user.is_active:
        return jsonify({'message': 'If that account exists, a reset link has been sent to the registered email.'}), 200

    token = secrets.token_urlsafe(48)
    user.reset_token = token
    user.reset_token_expires = datetime.utcnow() + timedelta(hours=1)
    db.session.commit()

    reset_url = f"{SITE_URL}/staff?reset_token={token}&type=staff"

    try:
        from src.utils.email import send_forgot_password_email
        sent = send_forgot_password_email(user, reset_url, account_type='staff')
    except Exception as e:
        print(f"[EMAIL] Staff forgot-password email failed: {e}")
        sent = False

    return jsonify({
        'message': 'If that account exists, a reset link has been sent to the registered email.',
        'email_sent': sent,
        'debug_token': token if not sent else None
    }), 200


@password_reset_bp.route('/staff/forgot-username', methods=['POST'])
def staff_forgot_username():
    data = request.get_json() or {}
    email = data.get('email', '').strip()

    if not email:
        return jsonify({'error': 'Please enter your email address'}), 400

    user = StaffUser.query.filter_by(email=email).first()

    if not user or not user.is_active:
        return jsonify({'message': 'If that email is registered, your username has been sent to it.'}), 200

    try:
        from src.utils.email import send_forgot_username_email
        sent = send_forgot_username_email(user, account_type='staff')
    except Exception as e:
        print(f"[EMAIL] Staff forgot-username email failed: {e}")
        sent = False

    return jsonify({
        'message': 'If that email is registered, your username has been sent to it.',
        'email_sent': sent,
        'debug_username': user.username if not sent else None
    }), 200


@password_reset_bp.route('/staff/reset-password', methods=['POST'])
def staff_reset_password():
    data = request.get_json() or {}
    token = data.get('token', '').strip()
    new_password = data.get('password', '').strip()

    if not token:
        return jsonify({'error': 'Reset token is required'}), 400
    if not new_password or len(new_password) < 6:
        return jsonify({'error': 'Password must be at least 6 characters'}), 400

    user = StaffUser.query.filter_by(reset_token=token).first()
    if not user:
        return jsonify({'error': 'Invalid or expired reset link. Please request a new one.'}), 400
    if user.reset_token_expires and datetime.utcnow() > user.reset_token_expires:
        user.reset_token = None
        user.reset_token_expires = None
        db.session.commit()
        return jsonify({'error': 'This reset link has expired. Please request a new one.'}), 400

    user.set_password(new_password)
    user.reset_token = None
    user.reset_token_expires = None
    db.session.commit()

    # Send password changed notification
    try:
        from src.utils.email import send_password_changed_email
        send_password_changed_email(user, account_type='staff')
    except Exception as e:
        print(f"[EMAIL] Staff password-changed email failed: {e}")

    return jsonify({'message': 'Password updated successfully. You can now log in.'}), 200


# ─── Customer: Forgot Password ────────────────────────────────────────────────

@password_reset_bp.route('/auth/forgot-password', methods=['POST'])
def customer_forgot_password():
    data = request.get_json() or {}
    identifier = data.get('identifier', '').strip()

    if not identifier:
        return jsonify({'error': 'Please enter your username or email'}), 400

    user = User.query.filter(
        (User.username == identifier) | (User.email == identifier)
    ).first()

    if not user or not user.is_active:
        return jsonify({'message': 'If that account exists, a reset link has been sent to the registered email.'}), 200

    token = secrets.token_urlsafe(48)
    user.reset_token = token
    user.reset_token_expires = datetime.utcnow() + timedelta(hours=1)
    db.session.commit()

    reset_url = f"{SITE_URL}/?reset_token={token}&type=customer"

    try:
        from src.utils.email import send_forgot_password_email
        sent = send_forgot_password_email(user, reset_url, account_type='customer')
    except Exception as e:
        print(f"[EMAIL] Customer forgot-password email failed: {e}")
        sent = False

    return jsonify({
        'message': 'If that account exists, a reset link has been sent to the registered email.',
        'email_sent': sent,
        'debug_token': token if not sent else None
    }), 200


@password_reset_bp.route('/auth/reset-password', methods=['POST'])
def customer_reset_password():
    data = request.get_json() or {}
    token = data.get('token', '').strip()
    new_password = data.get('password', '').strip()

    if not token:
        return jsonify({'error': 'Reset token is required'}), 400
    if not new_password or len(new_password) < 6:
        return jsonify({'error': 'Password must be at least 6 characters'}), 400

    user = User.query.filter_by(reset_token=token).first()
    if not user:
        return jsonify({'error': 'Invalid or expired reset link. Please request a new one.'}), 400
    if user.reset_token_expires and datetime.utcnow() > user.reset_token_expires:
        user.reset_token = None
        user.reset_token_expires = None
        db.session.commit()
        return jsonify({'error': 'This reset link has expired. Please request a new one.'}), 400

    user.set_password(new_password)
    user.reset_token = None
    user.reset_token_expires = None
    db.session.commit()

    # Send password changed notification
    try:
        from src.utils.email import send_password_changed_email
        send_password_changed_email(user, account_type='customer')
    except Exception as e:
        print(f"[EMAIL] Customer password-changed email failed: {e}")

    return jsonify({'message': 'Password updated successfully. You can now log in.'}), 200
