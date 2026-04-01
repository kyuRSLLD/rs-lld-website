"""
customer_admin.py
─────────────────
Bulk customer management: CSV export and CSV import.

CSV columns (in order):
  first_name, last_name, company_name, email, phone,
  orders, total_spent, joined, shipping_address, billing_address

Phone numbers are normalised to (xxx)xxx-xxxx on import.
"""

import csv
import io
import re
from datetime import datetime

from flask import Blueprint, Response, jsonify, request
from src.models.user import User, db
from src.models.order import Order
from src.routes.order import staff_required
from sqlalchemy import func

customer_admin_bp = Blueprint('customer_admin', __name__)

# ─── Helpers ──────────────────────────────────────────────────────────────────

def _format_phone(raw: str) -> str | None:
    """Normalise any phone string to (xxx)xxx-xxxx.
    Returns None if the input cannot be parsed to 10 digits."""
    if not raw:
        return None
    digits = re.sub(r'\D', '', raw)
    if len(digits) == 11 and digits[0] == '1':
        digits = digits[1:]          # strip leading country code 1
    if len(digits) != 10:
        return None                  # invalid — caller decides what to do
    return f'({digits[:3]}){digits[3:6]}-{digits[6:]}'


def _split_username(first: str, last: str, email: str) -> str:
    """Build a unique username from first+last or email prefix."""
    base = (first + last).lower().strip() or email.split('@')[0]
    base = re.sub(r'[^a-z0-9_]', '', base) or 'customer'
    candidate = base
    counter = 1
    while User.query.filter_by(username=candidate).first():
        candidate = f'{base}{counter}'
        counter += 1
    return candidate


# ─── Export customers as CSV ──────────────────────────────────────────────────

@customer_admin_bp.route('/staff/customers/export-csv', methods=['GET'])
@staff_required
def export_customers_csv():
    """Download all customers as a CSV file."""
    users = User.query.order_by(User.created_at.asc()).all()
    output = io.StringIO()
    writer = csv.writer(output)

    writer.writerow([
        'first_name', 'last_name', 'company_name', 'email', 'phone',
        'orders', 'total_spent', 'joined',
        'shipping_address', 'billing_address',
    ])

    for u in users:
        # Split username into first / last best-effort
        parts = (u.username or '').split(' ', 1)
        first = parts[0] if parts else ''
        last  = parts[1] if len(parts) > 1 else ''

        order_count = Order.query.filter_by(user_id=u.id).count()
        total_spent = (
            db.session.query(func.sum(Order.total_amount))
            .filter_by(user_id=u.id).scalar() or 0
        )
        joined = u.created_at.strftime('%Y-%m-%d') if u.created_at else ''

        writer.writerow([
            first,
            last,
            u.company_name or '',
            u.email or '',
            u.phone or '',
            order_count,
            f'{total_spent:.2f}',
            joined,
            u.shipping_address or '',
            u.billing_address or '',
        ])

    output.seek(0)
    return Response(
        output.getvalue(),
        mimetype='text/csv',
        headers={'Content-Disposition': 'attachment; filename=lld_customers.csv'},
    )


# ─── Download blank CSV template ─────────────────────────────────────────────

@customer_admin_bp.route('/staff/customers/csv-template', methods=['GET'])
@staff_required
def download_customer_template():
    """Return a blank CSV template with the correct headers."""
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        'first_name', 'last_name', 'company_name', 'email', 'phone',
        'orders', 'total_spent', 'joined',
        'shipping_address', 'billing_address',
    ])
    # One sample row so users understand the expected format
    writer.writerow([
        'Jane', 'Smith', 'Best Bistro LLC', 'jane@bestbistro.com',
        '(555)123-4567', '0', '0.00', '2025-01-15',
        '123 Main St, Houston TX 77001', '123 Main St, Houston TX 77001',
    ])
    output.seek(0)
    return Response(
        output.getvalue(),
        mimetype='text/csv',
        headers={'Content-Disposition': 'attachment; filename=lld_customers_template.csv'},
    )


# ─── Import customers from CSV ────────────────────────────────────────────────

@customer_admin_bp.route('/staff/customers/import-csv', methods=['POST'])
@staff_required
def import_customers_csv():
    """
    Bulk-import customers from a CSV file.

    Behaviour:
    - If a customer with the same email already exists → UPDATE their profile
      (name, company, phone, addresses).  Orders/spent are read-only and ignored.
    - If no matching email → CREATE a new customer account with a random password
      (they can use "Forgot Password" to set their own).
    - Phone numbers are normalised to (xxx)xxx-xxxx.  Rows with an unparseable
      phone number are flagged as a warning but still imported.
    """
    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded'}), 400

    file = request.files['file']
    if not file.filename.lower().endswith('.csv'):
        return jsonify({'error': 'File must be a .csv'}), 400

    try:
        stream = io.StringIO(file.stream.read().decode('utf-8-sig'))
        reader = csv.DictReader(stream)
    except Exception as e:
        return jsonify({'error': f'Could not read file: {e}'}), 400

    created  = 0
    updated  = 0
    skipped  = 0
    warnings = []
    errors   = []

    for i, row in enumerate(reader, start=2):   # row 1 is header
        email = (row.get('email') or '').strip().lower()
        if not email:
            skipped += 1
            errors.append(f'Row {i}: email is required — skipped')
            continue

        first = (row.get('first_name') or '').strip()
        last  = (row.get('last_name')  or '').strip()
        full_name = f'{first} {last}'.strip() or email.split('@')[0]

        company  = (row.get('company_name') or '').strip() or None
        raw_phone = (row.get('phone') or '').strip()
        phone    = _format_phone(raw_phone)
        if raw_phone and phone is None:
            warnings.append(
                f'Row {i} ({email}): phone "{raw_phone}" could not be formatted '
                f'to (xxx)xxx-xxxx — saved as-is'
            )
            phone = raw_phone or None   # keep original rather than lose it

        shipping = (row.get('shipping_address') or '').strip() or None
        billing  = (row.get('billing_address')  or '').strip() or None

        # Parse joined date if provided
        joined_str = (row.get('joined') or '').strip()
        joined_dt  = None
        if joined_str:
            for fmt in ('%Y-%m-%d', '%m/%d/%Y', '%d/%m/%Y', '%Y/%m/%d'):
                try:
                    joined_dt = datetime.strptime(joined_str, fmt)
                    break
                except ValueError:
                    continue

        try:
            existing = User.query.filter_by(email=email).first()

            if existing:
                # ── UPDATE existing customer ──────────────────────────────
                existing.company_name = company or existing.company_name
                existing.phone        = phone    or existing.phone
                if shipping:
                    existing.shipping_address = shipping
                if billing:
                    existing.billing_address  = billing
                # Update username (display name) if we have a better value
                if first or last:
                    existing.username = _split_username(first, last, email) \
                        if not existing.username else existing.username
                updated += 1

            else:
                # ── CREATE new customer ───────────────────────────────────
                username = _split_username(first, last, email)
                import secrets
                temp_password = secrets.token_urlsafe(12)

                user = User(
                    username=username,
                    email=email,
                    company_name=company,
                    phone=phone,
                    shipping_address=shipping,
                    billing_address=billing,
                    is_active=True,
                    created_at=joined_dt or datetime.utcnow(),
                )
                user.set_password(temp_password)
                db.session.add(user)
                created += 1

        except Exception as e:
            errors.append(f'Row {i} ({email}): {e}')
            skipped += 1
            db.session.rollback()
            continue

    try:
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Database commit failed: {e}'}), 500

    return jsonify({
        'success': True,
        'created':  created,
        'updated':  updated,
        'skipped':  skipped,
        'warnings': warnings,
        'errors':   errors,
    })


# ─── Create a single customer manually ──────────────────────────────────────────

@customer_admin_bp.route('/staff/customers', methods=['POST'])
@staff_required
def create_customer():
    """
    Manually create a single customer account from the Staff Portal.

    Required body fields: first_name OR company_name, email
    Optional: last_name, phone, shipping_address, billing_address
    """
    data = request.json or {}

    email = (data.get('email') or '').strip().lower()
    if not email:
        return jsonify({'error': 'Email is required'}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({'error': f'A customer with email "{email}" already exists'}), 409

    first   = (data.get('first_name') or '').strip()
    last    = (data.get('last_name')  or '').strip()
    company = (data.get('company_name') or '').strip() or None
    raw_phone = (data.get('phone') or '').strip()
    phone   = _format_phone(raw_phone) or (raw_phone or None)
    shipping = (data.get('shipping_address') or '').strip() or None
    billing  = (data.get('billing_address')  or '').strip() or None

    if not first and not company:
        return jsonify({'error': 'First name or company name is required'}), 400

    import secrets
    username     = _split_username(first, last, email)
    temp_password = secrets.token_urlsafe(12)

    user = User(
        username=username,
        email=email,
        company_name=company,
        phone=phone,
        shipping_address=shipping,
        billing_address=billing,
        is_active=True,
        created_at=datetime.utcnow(),
    )
    user.set_password(temp_password)
    db.session.add(user)
    db.session.commit()

    return jsonify({
        'success': True,
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'company_name': user.company_name,
        'phone': user.phone,
    }), 201


# ─── Update a single customer ───────────────────────────────────────────────────

@customer_admin_bp.route('/staff/customers/<int:user_id>', methods=['PUT'])
@staff_required
def update_customer(user_id):
    """
    Update an existing customer's profile fields.
    Body fields (all optional): first_name, last_name, company_name,
                                email, phone, shipping_address, billing_address
    """
    user = User.query.get_or_404(user_id)
    data = request.json or {}

    # Email uniqueness check (skip if unchanged)
    new_email = (data.get('email') or '').strip().lower()
    if new_email and new_email != (user.email or '').lower():
        if User.query.filter(User.email == new_email, User.id != user_id).first():
            return jsonify({'error': f'Email "{new_email}" is already used by another customer'}), 409
        user.email = new_email

    first   = (data.get('first_name') or '').strip()
    last    = (data.get('last_name')  or '').strip()
    company = (data.get('company_name') or '').strip() or None
    raw_phone = (data.get('phone') or '').strip()
    phone   = _format_phone(raw_phone) or (raw_phone or None)
    shipping = (data.get('shipping_address') or '').strip() or None
    billing  = (data.get('billing_address')  or '').strip() or None

    # Update first_name, last_name columns and username display name
    if first or last:
        if first:
            user.first_name = first
        if last:
            user.last_name = last
        full = f'{first} {last}'.strip()
        user.username = full if full else user.username

    if company is not None:
        user.company_name = company
    if phone is not None:
        user.phone = phone
    if shipping is not None:
        user.shipping_address = shipping
    if billing is not None:
        user.billing_address = billing

    try:
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Database error: {e}'}), 500

    return jsonify({
        'success': True,
        'id': user.id,
        'username': user.username,
        'first_name': user.first_name,
        'last_name': user.last_name,
        'email': user.email,
        'company_name': user.company_name,
        'phone': user.phone,
        'shipping_address': user.shipping_address,
        'billing_address': user.billing_address,
    })


# ─── Delete a single customer ─────────────────────────────────────────────────

@customer_admin_bp.route('/staff/customers/<int:user_id>', methods=['DELETE'])
@staff_required
def delete_customer(user_id):
    """
    Permanently delete a customer account.
    Associated orders are preserved but unlinked (user_id set to NULL).
    """
    user = User.query.get_or_404(user_id)
    # Unlink orders rather than cascade-delete them so order history is kept
    Order.query.filter_by(user_id=user_id).update({'user_id': None})
    db.session.delete(user)
    db.session.commit()
    return jsonify({'success': True, 'deleted_id': user_id})


# ─── Bulk delete customers ────────────────────────────────────────────────────

@customer_admin_bp.route('/staff/customers/bulk-delete', methods=['POST'])
@staff_required
def bulk_delete_customers():
    """
    Delete multiple customers at once.
    Body: { "ids": [1, 2, 3] }
    """
    data = request.json or {}
    ids = data.get('ids', [])
    if not ids:
        return jsonify({'error': 'No IDs provided'}), 400

    deleted = 0
    for uid in ids:
        user = User.query.get(uid)
        if user:
            Order.query.filter_by(user_id=uid).update({'user_id': None})
            db.session.delete(user)
            deleted += 1

    db.session.commit()
    return jsonify({'success': True, 'deleted': deleted})
