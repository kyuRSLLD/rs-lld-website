"""
Save Me Money – public form submission endpoint.
Accepts name, restaurant name, address, city, state, phone, email,
optional RD customer #, and an optional invoice file attachment.
Emails the submission to info@lldrestaurantsupply.com.

Uses the shared send_email() utility from src.utils.email so that
SMTP credentials are loaded once and the request never hangs on a
failed email connection.
"""
import os
import threading
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders
import smtplib

from flask import Blueprint, request, jsonify

save_me_money_bp = Blueprint('save_me_money', __name__)

ALLOWED_EXTENSIONS = {'jpg', 'jpeg', 'png', 'pdf'}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


def _allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def _send_email_async(form_data, file_bytes=None, file_name=None, file_mime=None):
    """Send the Save Me Money email in a background thread so the HTTP response is never blocked."""
    smtp_host = os.environ.get('SMTP_HOST', 'smtp.gmail.com')
    smtp_port = int(os.environ.get('SMTP_PORT', '587'))
    smtp_user = os.environ.get('SMTP_USER', '')
    smtp_pass = os.environ.get('SMTP_PASSWORD', '')
    from_addr = os.environ.get('SMTP_FROM', smtp_user or 'info@lldrestaurantsupply.com')
    to_addr   = 'info@lldrestaurantsupply.com'

    name        = form_data.get('name', '')
    restaurant  = form_data.get('restaurant_name', '')
    address     = form_data.get('address', '')
    city        = form_data.get('city', '')
    state       = form_data.get('state', '')
    phone       = form_data.get('phone', '')
    email       = form_data.get('email', '')
    rd_customer = form_data.get('rd_customer_number', '') or 'N/A'

    text_body = f"""New "Save Me Money" Submission
==============================
Name:              {name}
Restaurant:        {restaurant}
Address:           {address}, {city}, {state}
Phone:             {phone}
Email:             {email}
RD Customer #:     {rd_customer}
Invoice attached:  {'Yes – ' + file_name if file_name else 'No'}
"""

    html_body = f"""
<html><body style="font-family:Arial,sans-serif;color:#333;">
  <h2 style="color:#1e40af;">New &#8220;Save Me Money&#8221; Submission</h2>
  <table style="border-collapse:collapse;width:100%;max-width:600px;">
    <tr><td style="padding:8px;font-weight:bold;background:#f0f4ff;">Name</td><td style="padding:8px;">{name}</td></tr>
    <tr><td style="padding:8px;font-weight:bold;background:#f0f4ff;">Restaurant</td><td style="padding:8px;">{restaurant}</td></tr>
    <tr><td style="padding:8px;font-weight:bold;background:#f0f4ff;">Address</td><td style="padding:8px;">{address}, {city}, {state}</td></tr>
    <tr><td style="padding:8px;font-weight:bold;background:#f0f4ff;">Phone</td><td style="padding:8px;">{phone}</td></tr>
    <tr><td style="padding:8px;font-weight:bold;background:#f0f4ff;">Email</td><td style="padding:8px;">{email}</td></tr>
    <tr><td style="padding:8px;font-weight:bold;background:#f0f4ff;">RD Customer #</td><td style="padding:8px;">{rd_customer}</td></tr>
    <tr><td style="padding:8px;font-weight:bold;background:#f0f4ff;">Invoice</td><td style="padding:8px;">{'Attached: ' + file_name if file_name else 'Not provided'}</td></tr>
  </table>
</body></html>
"""

    if not smtp_user or not smtp_pass:
        print(f"[SAVE ME MONEY] SMTP not configured — submission from {name} / {email}")
        print(text_body)
        return

    try:
        msg = MIMEMultipart('mixed')
        msg['Subject'] = f'Save Me Money Request – {restaurant} ({name})'
        msg['From']    = f'RS LLD Website <{from_addr}>'
        msg['To']      = to_addr
        msg['Reply-To'] = email

        alt = MIMEMultipart('alternative')
        alt.attach(MIMEText(text_body, 'plain'))
        alt.attach(MIMEText(html_body, 'html'))
        msg.attach(alt)

        if file_bytes and file_name:
            part = MIMEBase('application', 'octet-stream')
            part.set_payload(file_bytes)
            encoders.encode_base64(part)
            part.add_header('Content-Disposition', f'attachment; filename="{file_name}"')
            if file_mime:
                part.set_type(file_mime)
            msg.attach(part)

        with smtplib.SMTP(smtp_host, smtp_port, timeout=10) as server:
            server.ehlo()
            server.starttls()
            server.login(smtp_user, smtp_pass)
            server.sendmail(from_addr, [to_addr], msg.as_string())
        print(f"[SAVE ME MONEY] Email sent for {name} / {restaurant}")
    except Exception as e:
        print(f"[SAVE ME MONEY] Email send failed: {e}")


@save_me_money_bp.route('/save-me-money', methods=['POST'])
def submit_save_me_money():
    """Handle the Save Me Money form submission."""
    # Required fields
    required = ['name', 'restaurant_name', 'address', 'city', 'state', 'phone', 'email']
    form_data = {}
    for field in required:
        val = request.form.get(field, '').strip()
        if not val:
            return jsonify({'error': f'Missing required field: {field}'}), 400
        form_data[field] = val

    form_data['rd_customer_number'] = request.form.get('rd_customer_number', '').strip()

    # Optional invoice file
    file_bytes = None
    file_name  = None
    file_mime  = None

    if 'invoice' in request.files:
        f = request.files['invoice']
        if f and f.filename:
            if not _allowed_file(f.filename):
                return jsonify({'error': 'Invalid file type. Only JPG, PNG, and PDF are allowed.'}), 400
            raw = f.read()
            if len(raw) > MAX_FILE_SIZE:
                return jsonify({'error': 'File too large. Maximum size is 10 MB.'}), 400
            file_bytes = raw
            file_name  = f.filename
            file_mime  = f.content_type

    # Fire-and-forget: send email in background so the HTTP response is instant
    t = threading.Thread(
        target=_send_email_async,
        args=(form_data, file_bytes, file_name, file_mime),
        daemon=True,
    )
    t.start()

    return jsonify({
        'success': True,
        'message': 'Thank you! We will review your invoice and get back to you shortly.',
    })
