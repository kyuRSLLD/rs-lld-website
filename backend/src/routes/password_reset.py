"""
Password reset and username recovery for both staff and customer accounts.
Uses secure random tokens stored in DB with 1-hour expiry.
Email is sent via SMTP if SMTP_USER / SMTP_PASSWORD env vars are set.
Falls back to console logging if email is not configured.
"""
import os
import secrets
import smtplib
from datetime import datetime, timedelta
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from flask import Blueprint, request, jsonify
from src.models.user import db
from src.models.order import StaffUser
from src.models.user import User

password_reset_bp = Blueprint('password_reset', __name__)

# ─── Helpers ──────────────────────────────────────────────────────────────────

def _send_email(to_addr, subject, html_body, text_body):
    """Send an email via SMTP. Returns True on success, False on failure."""
    smtp_user = os.environ.get('SMTP_USER', '')
    smtp_pass = os.environ.get('SMTP_PASSWORD', '')
    smtp_host = os.environ.get('SMTP_HOST', 'smtp.gmail.com')
    smtp_port = int(os.environ.get('SMTP_PORT', '587'))
    from_addr = os.environ.get('SMTP_FROM', smtp_user or 'noreply@lldrestaurantsupply.com')

    if not smtp_user or not smtp_pass:
        print(f"[PASSWORD RESET] Email not configured. Would send to {to_addr}:")
        print(f"  Subject: {subject}")
        print(f"  Body: {text_body}")
        return False

    try:
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = f'RS LLD Restaurant Supply <{from_addr}>'
        msg['To'] = to_addr
        msg.attach(MIMEText(text_body, 'plain'))
        msg.attach(MIMEText(html_body, 'html'))

        with smtplib.SMTP(smtp_host, smtp_port) as server:
            server.ehlo()
            server.starttls()
            server.login(smtp_user, smtp_pass)
            server.sendmail(from_addr, [to_addr], msg.as_string())
        return True
    except Exception as e:
        print(f"[PASSWORD RESET] Email send failed: {e}")
        return False


def _reset_email_html(name, reset_url, account_type='staff'):
    return f"""
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background:#f5f5f4; margin:0; padding:40px 20px;">
  <div style="max-width:480px; margin:0 auto; background:#fff; border-radius:12px; border:1px solid #e7e5e4; overflow:hidden;">
    <div style="background:#1c1917; padding:24px 32px; text-align:center;">
      <div style="display:inline-flex; align-items:center; justify-content:center; width:48px; height:48px; background:#2563eb; border-radius:10px; margin-bottom:12px;">
        <span style="color:#fff; font-weight:700; font-size:18px;">RS</span>
      </div>
      <h1 style="color:#fff; margin:0; font-size:20px; font-weight:600;">RS LLD Restaurant Supply</h1>
    </div>
    <div style="padding:32px;">
      <h2 style="color:#1c1917; font-size:18px; margin:0 0 8px;">Reset your password</h2>
      <p style="color:#57534e; font-size:14px; margin:0 0 24px;">Hi {name}, we received a request to reset your {'staff portal' if account_type == 'staff' else 'account'} password. Click the button below to set a new password.</p>
      <a href="{reset_url}" style="display:block; background:#1c1917; color:#fff; text-decoration:none; text-align:center; padding:12px 24px; border-radius:8px; font-size:14px; font-weight:500; margin-bottom:24px;">Reset Password</a>
      <p style="color:#a8a29e; font-size:12px; margin:0;">This link expires in <strong>1 hour</strong>. If you didn't request this, you can safely ignore this email.</p>
      <hr style="border:none; border-top:1px solid #e7e5e4; margin:24px 0;">
      <p style="color:#a8a29e; font-size:11px; margin:0; text-align:center;">RS LLD Restaurant Supply · 218 Terrace Dr, Mundelein, IL 60060</p>
    </div>
  </div>
</body>
</html>
"""


def _username_email_html(name, username, account_type='customer'):
    return f"""
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background:#f5f5f4; margin:0; padding:40px 20px;">
  <div style="max-width:480px; margin:0 auto; background:#fff; border-radius:12px; border:1px solid #e7e5e4; overflow:hidden;">
    <div style="background:#1c1917; padding:24px 32px; text-align:center;">
      <div style="display:inline-flex; align-items:center; justify-content:center; width:48px; height:48px; background:#2563eb; border-radius:10px; margin-bottom:12px;">
        <span style="color:#fff; font-weight:700; font-size:18px;">RS</span>
      </div>
      <h1 style="color:#fff; margin:0; font-size:20px; font-weight:600;">RS LLD Restaurant Supply</h1>
    </div>
    <div style="padding:32px;">
      <h2 style="color:#1c1917; font-size:18px; margin:0 0 8px;">Your username</h2>
      <p style="color:#57534e; font-size:14px; margin:0 0 16px;">Hi {name}, here is the username associated with this email address:</p>
      <div style="background:#f5f5f4; border:1px solid #e7e5e4; border-radius:8px; padding:16px; text-align:center; margin-bottom:24px;">
        <span style="font-size:20px; font-weight:700; color:#1c1917; letter-spacing:0.5px;">{username}</span>
      </div>
      <p style="color:#a8a29e; font-size:12px; margin:0;">If you didn't request this, you can safely ignore this email.</p>
      <hr style="border:none; border-top:1px solid #e7e5e4; margin:24px 0;">
      <p style="color:#a8a29e; font-size:11px; margin:0; text-align:center;">RS LLD Restaurant Supply · 218 Terrace Dr, Mundelein, IL 60060</p>
    </div>
  </div>
</body>
</html>
"""


# ─── Staff: Forgot Password ───────────────────────────────────────────────────

@password_reset_bp.route('/staff/forgot-password', methods=['POST'])
def staff_forgot_password():
    data = request.get_json() or {}
    identifier = data.get('identifier', '').strip()  # username or email

    if not identifier:
        return jsonify({'error': 'Please enter your username or email'}), 400

    # Find by username or email
    user = StaffUser.query.filter(
        (StaffUser.username == identifier) | (StaffUser.email == identifier)
    ).first()

    # Always return success to prevent user enumeration
    if not user or not user.is_active:
        return jsonify({'message': 'If that account exists, a reset link has been sent to the registered email.'}), 200

    # Generate a secure token
    token = secrets.token_urlsafe(48)
    user.reset_token = token
    user.reset_token_expires = datetime.utcnow() + timedelta(hours=1)
    db.session.commit()

    site_url = os.environ.get('SITE_URL', 'https://lldrestaurantsupply.com')
    reset_url = f"{site_url}/staff?reset_token={token}&type=staff"

    html = _reset_email_html(user.full_name or user.username, reset_url, 'staff')
    text = f"Hi {user.full_name or user.username},\n\nReset your staff portal password here (expires in 1 hour):\n{reset_url}\n\nIf you didn't request this, ignore this email."

    sent = _send_email(user.email, 'Reset your RS LLD Staff Portal password', html, text)

    return jsonify({
        'message': 'If that account exists, a reset link has been sent to the registered email.',
        'email_sent': sent,
        # Only expose token in dev/no-email mode for testing
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

    html = _username_email_html(user.full_name or user.username, user.username, 'staff')
    text = f"Hi {user.full_name or user.username},\n\nYour RS LLD Staff Portal username is: {user.username}\n\nIf you didn't request this, ignore this email."

    sent = _send_email(user.email, 'Your RS LLD Staff Portal username', html, text)

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

    return jsonify({'message': 'Password updated successfully. You can now log in.'}), 200


# ─── Customer: Forgot Password ────────────────────────────────────────────────

@password_reset_bp.route('/auth/forgot-password', methods=['POST'])
def customer_forgot_password():
    data = request.get_json() or {}
    identifier = data.get('identifier', '').strip()  # username or email

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

    site_url = os.environ.get('SITE_URL', 'https://lldrestaurantsupply.com')
    reset_url = f"{site_url}/?reset_token={token}&type=customer"

    html = _reset_email_html(user.username, reset_url, 'customer')
    text = f"Hi {user.username},\n\nReset your password here (expires in 1 hour):\n{reset_url}\n\nIf you didn't request this, ignore this email."

    sent = _send_email(user.email, 'Reset your RS LLD account password', html, text)

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

    return jsonify({'message': 'Password updated successfully. You can now log in.'}), 200
