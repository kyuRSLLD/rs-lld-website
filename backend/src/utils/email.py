"""
Email notification utility for RS LLD Restaurant Supply.
Sends branded HTML emails via Google Workspace SMTP (smtp.gmail.com).

Environment variables required:
  SMTP_USER     = info@lldrestaurantsupply.com
  SMTP_PASSWORD = Google Workspace App Password (16 chars, no spaces)
  SMTP_HOST     = smtp.gmail.com  (default)
  SMTP_PORT     = 587             (default)
  SITE_URL      = https://www.lldrestaurantsupply.com (default)

Every outbound email is BCC'd to info@lldrestaurantsupply.com.
"""

import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

# ─── Config ───────────────────────────────────────────────────────────────────

SMTP_HOST = os.environ.get('SMTP_HOST', 'smtp.gmail.com')
SMTP_PORT = int(os.environ.get('SMTP_PORT', '587'))
SMTP_USER = os.environ.get('SMTP_USER', '')
SMTP_PASS = os.environ.get('SMTP_PASSWORD', '')
FROM_ADDR = os.environ.get('SMTP_FROM', 'info@lldrestaurantsupply.com')
BCC_ADDR  = 'info@lldrestaurantsupply.com'
SITE_URL  = os.environ.get('SITE_URL', 'https://www.lldrestaurantsupply.com')

# ─── Base template ─────────────────────────────────────────────────────────────

def _wrap(title: str, body_html: str) -> str:
    """Wrap body content in the branded RS LLD email shell."""
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{title}</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f4;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;border:1px solid #e7e5e4;overflow:hidden;max-width:560px;">

        <!-- Header -->
        <tr>
          <td style="background:#1c1917;padding:28px 32px;text-align:center;">
            <div style="display:inline-block;background:#2563eb;border-radius:10px;width:44px;height:44px;line-height:44px;text-align:center;margin-bottom:10px;">
              <span style="color:#ffffff;font-weight:700;font-size:16px;">RS</span>
            </div>
            <div style="color:#ffffff;font-size:18px;font-weight:600;margin-top:4px;">RS LLD Restaurant Supply</div>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:32px;">
            {body_html}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f5f5f4;padding:20px 32px;text-align:center;border-top:1px solid #e7e5e4;">
            <p style="margin:0;color:#a8a29e;font-size:11px;">
              RS LLD Restaurant Supply &nbsp;·&nbsp; 218 Terrace Dr, Mundelein, IL 60060<br>
              <a href="{SITE_URL}" style="color:#a8a29e;">www.lldrestaurantsupply.com</a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>"""


# ─── Core send function ────────────────────────────────────────────────────────

def send_email(to_addr: str, subject: str, html_body: str, text_body: str = '') -> bool:
    """
    Send a branded HTML email.
    Always BCC's info@lldrestaurantsupply.com.
    Returns True on success, False on failure (logs error to stdout).
    """
    if not SMTP_USER or not SMTP_PASS:
        print(f"[EMAIL] Not configured — would send to {to_addr}: {subject}")
        return False

    try:
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From']    = f'RS LLD Restaurant Supply <{FROM_ADDR}>'
        msg['To']      = to_addr
        msg['Bcc']     = BCC_ADDR

        if text_body:
            msg.attach(MIMEText(text_body, 'plain'))
        msg.attach(MIMEText(html_body, 'html'))

        recipients = [to_addr]
        if BCC_ADDR and BCC_ADDR != to_addr:
            recipients.append(BCC_ADDR)

        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.ehlo()
            server.starttls()
            server.login(SMTP_USER, SMTP_PASS)
            server.sendmail(FROM_ADDR, recipients, msg.as_string())

        print(f"[EMAIL] Sent '{subject}' to {to_addr}")
        return True

    except Exception as exc:
        print(f"[EMAIL] Failed to send '{subject}' to {to_addr}: {exc}")
        return False


# ─── Template helpers ──────────────────────────────────────────────────────────

def _status_badge(status: str) -> str:
    colors = {
        'pending':   ('#fef3c7', '#92400e', 'Pending'),
        'confirmed': ('#dbeafe', '#1e40af', 'Confirmed'),
        'packed':    ('#ede9fe', '#5b21b6', 'Packed'),
        'shipped':   ('#d1fae5', '#065f46', 'Shipped'),
        'delivered': ('#d1fae5', '#065f46', 'Delivered'),
        'cancelled': ('#fee2e2', '#991b1b', 'Cancelled'),
    }
    bg, fg, label = colors.get(status, ('#f5f5f4', '#1c1917', status.capitalize()))
    return (f'<span style="background:{bg};color:{fg};padding:4px 12px;'
            f'border-radius:20px;font-size:13px;font-weight:600;">{label}</span>')


def _order_items_table(items: list) -> str:
    rows = ''
    for item in items:
        rows += f"""
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #f5f5f4;color:#1c1917;font-size:14px;">
            {item.get('product_name', '')}
            <span style="color:#a8a29e;font-size:12px;"> &nbsp;{item.get('product_sku','')}</span>
          </td>
          <td style="padding:10px 0;border-bottom:1px solid #f5f5f4;color:#57534e;font-size:14px;text-align:center;">
            x{item.get('quantity', 1)}
          </td>
          <td style="padding:10px 0;border-bottom:1px solid #f5f5f4;color:#1c1917;font-size:14px;text-align:right;font-weight:500;">
            ${item.get('line_total', 0):.2f}
          </td>
        </tr>"""
    return f"""
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;">
      <thead>
        <tr>
          <th style="text-align:left;color:#a8a29e;font-size:11px;font-weight:600;text-transform:uppercase;padding-bottom:8px;border-bottom:2px solid #e7e5e4;">Item</th>
          <th style="text-align:center;color:#a8a29e;font-size:11px;font-weight:600;text-transform:uppercase;padding-bottom:8px;border-bottom:2px solid #e7e5e4;">Qty</th>
          <th style="text-align:right;color:#a8a29e;font-size:11px;font-weight:600;text-transform:uppercase;padding-bottom:8px;border-bottom:2px solid #e7e5e4;">Total</th>
        </tr>
      </thead>
      <tbody>{rows}</tbody>
    </table>"""


# ─── Event email functions ─────────────────────────────────────────────────────

def send_order_confirmation(order) -> bool:
    """Send order confirmation email to the customer after placing an order."""
    to = order.delivery_email if hasattr(order, 'delivery_email') and order.delivery_email else None

    # Try to get email from linked user account
    if not to and order.user_id:
        from src.models.user import User
        user = User.query.get(order.user_id)
        if user:
            to = user.email

    if not to:
        print(f"[EMAIL] No email for order {order.order_number} — skipping confirmation")
        return False

    name = order.delivery_name or 'Valued Customer'
    items_html = _order_items_table([{
        'product_name': i.product_name,
        'product_sku':  i.product_sku,
        'quantity':     i.quantity,
        'line_total':   i.line_total,
    } for i in order.items])

    body = f"""
    <h2 style="color:#1c1917;font-size:20px;margin:0 0 4px;">Order Confirmed! 🎉</h2>
    <p style="color:#57534e;font-size:14px;margin:0 0 24px;">
      Hi {name}, thank you for your order. We've received it and will begin processing shortly.
    </p>

    <div style="background:#f5f5f4;border-radius:8px;padding:16px;margin-bottom:24px;">
      <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
        <span style="color:#57534e;font-size:13px;">Order Number</span>
        <span style="color:#1c1917;font-size:13px;font-weight:700;">{order.order_number}</span>
      </div>
      <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
        <span style="color:#57534e;font-size:13px;">Status</span>
        <span>{_status_badge(order.status)}</span>
      </div>
      <div style="display:flex;justify-content:space-between;">
        <span style="color:#57534e;font-size:13px;">Payment</span>
        <span style="color:#1c1917;font-size:13px;">{(order.payment_method or 'Net 30').upper()}</span>
      </div>
    </div>

    {items_html}

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;">
      <tr>
        <td style="color:#57534e;font-size:13px;padding:4px 0;">Subtotal</td>
        <td style="text-align:right;color:#1c1917;font-size:13px;padding:4px 0;">${order.subtotal:.2f}</td>
      </tr>
      {'<tr><td style="color:#57534e;font-size:13px;padding:4px 0;">Discount</td><td style="text-align:right;color:#16a34a;font-size:13px;padding:4px 0;">-$' + f'{order.discount_amount:.2f}' + '</td></tr>' if order.discount_amount else ''}
      <tr>
        <td style="color:#57534e;font-size:13px;padding:4px 0;">Delivery Fee</td>
        <td style="text-align:right;color:#1c1917;font-size:13px;padding:4px 0;">{'FREE' if order.delivery_fee == 0 else f'${order.delivery_fee:.2f}'}</td>
      </tr>
      <tr>
        <td style="color:#1c1917;font-size:15px;font-weight:700;padding:12px 0 4px;border-top:2px solid #e7e5e4;">Total</td>
        <td style="text-align:right;color:#1c1917;font-size:15px;font-weight:700;padding:12px 0 4px;border-top:2px solid #e7e5e4;">${order.total_amount:.2f}</td>
      </tr>
    </table>

    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin-top:24px;">
      <p style="margin:0;color:#166534;font-size:13px;">
        <strong>Delivery to:</strong> {order.delivery_address}, {order.delivery_city}, {order.delivery_state} {order.delivery_zip}
      </p>
    </div>

    <p style="color:#a8a29e;font-size:12px;margin-top:24px;">
      Questions? Reply to this email or call us. We're happy to help.
    </p>"""

    html = _wrap(f'Order {order.order_number} Confirmed', body)
    text = (f"Hi {name},\n\nThank you for your order!\n\n"
            f"Order: {order.order_number}\nTotal: ${order.total_amount:.2f}\n\n"
            f"We'll notify you as your order progresses.")

    return send_email(to, f'Order {order.order_number} Confirmed — RS LLD Restaurant Supply', html, text)


def send_order_status_update(order) -> bool:
    """Send order status update email to the customer."""
    to = None
    name = order.delivery_name or 'Valued Customer'

    if order.user_id:
        from src.models.user import User
        user = User.query.get(order.user_id)
        if user:
            to = user.email
            name = user.company_name or user.username or name

    if not to:
        print(f"[EMAIL] No email for order {order.order_number} status update — skipping")
        return False

    status_messages = {
        'confirmed': ('Your order has been confirmed', "We've confirmed your order and it's being prepared."),
        'packed':    ('Your order is packed and ready', "Great news — your order has been packed and is ready for pickup by our delivery team."),
        'shipped':   ('Your order is on its way!', "Your order has been shipped and is on its way to you."),
        'delivered': ('Your order has been delivered', "Your order has been delivered. Thank you for your business!"),
        'cancelled': ('Your order has been cancelled', "Your order has been cancelled. If you have questions, please contact us."),
    }

    headline, message = status_messages.get(order.status, (
        f'Order status updated to {order.status.capitalize()}',
        f'Your order status has been updated to {order.status}.'
    ))

    body = f"""
    <h2 style="color:#1c1917;font-size:20px;margin:0 0 4px;">{headline}</h2>
    <p style="color:#57534e;font-size:14px;margin:0 0 24px;">Hi {name}, {message}</p>

    <div style="background:#f5f5f4;border-radius:8px;padding:16px;margin-bottom:24px;">
      <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
        <span style="color:#57534e;font-size:13px;">Order Number</span>
        <span style="color:#1c1917;font-size:13px;font-weight:700;">{order.order_number}</span>
      </div>
      <div style="display:flex;justify-content:space-between;">
        <span style="color:#57534e;font-size:13px;">Current Status</span>
        <span>{_status_badge(order.status)}</span>
      </div>
    </div>

    {_order_items_table([{
        'product_name': i.product_name,
        'product_sku':  i.product_sku,
        'quantity':     i.quantity,
        'line_total':   i.line_total,
    } for i in order.items])}

    <p style="color:#a8a29e;font-size:12px;margin-top:24px;">
      Questions? Reply to this email or call us anytime.
    </p>"""

    html = _wrap(f'Order {order.order_number} — {order.status.capitalize()}', body)
    text = (f"Hi {name},\n\n{message}\n\n"
            f"Order: {order.order_number}\nStatus: {order.status.capitalize()}\n\n"
            f"Thank you for your business.")

    return send_email(to, f'Order {order.order_number} Update: {order.status.capitalize()} — RS LLD', html, text)


def send_welcome_email(user) -> bool:
    """Send a welcome email to a newly registered customer."""
    if not user.email:
        return False

    name = user.company_name or user.username

    body = f"""
    <h2 style="color:#1c1917;font-size:20px;margin:0 0 4px;">Welcome to RS LLD! 👋</h2>
    <p style="color:#57534e;font-size:14px;margin:0 0 24px;">
      Hi {name}, your account has been created successfully. You can now browse our full catalog,
      place orders, and track your deliveries — all in one place.
    </p>

    <div style="background:#f5f5f4;border-radius:8px;padding:16px;margin-bottom:24px;">
      <p style="margin:0 0 8px;color:#57534e;font-size:13px;"><strong style="color:#1c1917;">Username:</strong> {user.username}</p>
      <p style="margin:0;color:#57534e;font-size:13px;"><strong style="color:#1c1917;">Email:</strong> {user.email}</p>
    </div>

    <a href="{SITE_URL}/products"
       style="display:block;background:#1c1917;color:#ffffff;text-decoration:none;text-align:center;
              padding:14px 24px;border-radius:8px;font-size:14px;font-weight:600;margin-bottom:24px;">
      Browse Our Catalog
    </a>

    <p style="color:#57534e;font-size:13px;margin:0 0 8px;">
      We carry a full range of restaurant supplies including disposable goods, kitchen tools,
      cleaning supplies, packaging, pest control, and dry ingredients — with bulk pricing available.
    </p>

    <p style="color:#a8a29e;font-size:12px;margin-top:24px;">
      Questions? Just reply to this email — we're here to help.
    </p>"""

    html = _wrap('Welcome to RS LLD Restaurant Supply', body)
    text = (f"Hi {name},\n\nWelcome to RS LLD Restaurant Supply!\n\n"
            f"Your account is ready. Username: {user.username}\n\n"
            f"Browse our catalog: {SITE_URL}/products\n\n"
            f"Thank you for choosing RS LLD.")

    return send_email(user.email, 'Welcome to RS LLD Restaurant Supply!', html, text)


def send_password_changed_email(user, account_type: str = 'customer') -> bool:
    """Send a security notification when a password is successfully changed."""
    email = getattr(user, 'email', None)
    if not email:
        return False

    name = getattr(user, 'company_name', None) or getattr(user, 'full_name', None) or user.username
    portal_label = 'staff portal' if account_type == 'staff' else 'account'

    body = f"""
    <h2 style="color:#1c1917;font-size:20px;margin:0 0 4px;">Password Changed</h2>
    <p style="color:#57534e;font-size:14px;margin:0 0 24px;">
      Hi {name}, your {portal_label} password was successfully changed.
    </p>

    <div style="background:#fef3c7;border:1px solid #fcd34d;border-radius:8px;padding:16px;margin-bottom:24px;">
      <p style="margin:0;color:#92400e;font-size:13px;">
        ⚠️ <strong>Didn't make this change?</strong> Contact us immediately at
        <a href="mailto:info@lldrestaurantsupply.com" style="color:#92400e;">info@lldrestaurantsupply.com</a>
        so we can secure your account.
      </p>
    </div>

    <p style="color:#a8a29e;font-size:12px;margin:0;">
      This is an automated security notification. No action is required if you made this change.
    </p>"""

    html = _wrap('Password Changed — RS LLD', body)
    text = (f"Hi {name},\n\nYour {portal_label} password was successfully changed.\n\n"
            f"If you didn't make this change, contact us immediately at info@lldrestaurantsupply.com.")

    return send_email(email, f'Your RS LLD {portal_label.capitalize()} Password Was Changed', html, text)


def send_forgot_password_email(user, reset_url: str, account_type: str = 'customer') -> bool:
    """Send a password reset link email."""
    email = getattr(user, 'email', None)
    if not email:
        return False

    name = getattr(user, 'company_name', None) or getattr(user, 'full_name', None) or user.username
    portal_label = 'staff portal' if account_type == 'staff' else 'account'

    body = f"""
    <h2 style="color:#1c1917;font-size:20px;margin:0 0 4px;">Reset Your Password</h2>
    <p style="color:#57534e;font-size:14px;margin:0 0 24px;">
      Hi {name}, we received a request to reset your {portal_label} password.
      Click the button below to set a new password. This link expires in <strong>1 hour</strong>.
    </p>

    <a href="{reset_url}"
       style="display:block;background:#1c1917;color:#ffffff;text-decoration:none;text-align:center;
              padding:14px 24px;border-radius:8px;font-size:14px;font-weight:600;margin-bottom:24px;">
      Reset Password
    </a>

    <p style="color:#a8a29e;font-size:12px;margin:0;">
      If you didn't request a password reset, you can safely ignore this email.
      Your password will not be changed.
    </p>"""

    html = _wrap('Reset Your Password — RS LLD', body)
    text = (f"Hi {name},\n\nReset your {portal_label} password here (expires in 1 hour):\n{reset_url}\n\n"
            f"If you didn't request this, ignore this email.")

    return send_email(email, f'Reset Your RS LLD {portal_label.capitalize()} Password', html, text)


def send_forgot_username_email(user, account_type: str = 'customer') -> bool:
    """Send a username reminder email."""
    email = getattr(user, 'email', None)
    if not email:
        return False

    name = getattr(user, 'company_name', None) or getattr(user, 'full_name', None) or user.username

    body = f"""
    <h2 style="color:#1c1917;font-size:20px;margin:0 0 4px;">Your Username</h2>
    <p style="color:#57534e;font-size:14px;margin:0 0 16px;">
      Hi {name}, here is the username associated with this email address:
    </p>

    <div style="background:#f5f5f4;border:1px solid #e7e5e4;border-radius:8px;padding:20px;
                text-align:center;margin-bottom:24px;">
      <span style="font-size:22px;font-weight:700;color:#1c1917;letter-spacing:1px;">{user.username}</span>
    </div>

    <p style="color:#a8a29e;font-size:12px;margin:0;">
      If you didn't request this, you can safely ignore this email.
    </p>"""

    html = _wrap('Your RS LLD Username', body)
    text = (f"Hi {name},\n\nYour RS LLD username is: {user.username}\n\n"
            f"If you didn't request this, ignore this email.")

    return send_email(email, 'Your RS LLD Username', html, text)
