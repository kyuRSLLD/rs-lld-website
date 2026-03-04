import os
import stripe
from flask import Blueprint, request, jsonify, session
from werkzeug.utils import secure_filename
from datetime import datetime

from src.models.user import db
from src.models.order import Order

payment_bp = Blueprint('payment', __name__)

# Configure Stripe with the live secret key
stripe.api_key = os.environ.get('STRIPE_SECRET_KEY', '')

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp', 'pdf'}
UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), '..', 'uploads', 'checks')


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


# ─── Stripe Payment Intent ────────────────────────────────────────────────────

@payment_bp.route('/payments/create-intent', methods=['POST'])
def create_payment_intent():
    """
    Create a Stripe PaymentIntent for a given order total.
    Called from the frontend checkout when customer selects credit card.
    """
    try:
        data = request.json
        amount_dollars = data.get('amount')  # e.g. 49.99
        order_number = data.get('order_number', '')
        customer_name = data.get('customer_name', '')
        customer_email = data.get('customer_email', '')

        if not amount_dollars or float(amount_dollars) <= 0:
            return jsonify({'error': 'Invalid amount'}), 400

        # Stripe requires amount in cents (integer)
        amount_cents = int(round(float(amount_dollars) * 100))

        intent = stripe.PaymentIntent.create(
            amount=amount_cents,
            currency='usd',
            metadata={
                'order_number': order_number,
                'customer_name': customer_name,
                'customer_email': customer_email,
            },
            description=f'RS LLD Order {order_number}',
            receipt_email=customer_email if customer_email else None,
        )

        return jsonify({
            'success': True,
            'client_secret': intent.client_secret,
            'payment_intent_id': intent.id,
        })

    except stripe.error.StripeError as e:
        print(f"Stripe error: {str(e)}")
        return jsonify({'error': str(e.user_message)}), 400
    except Exception as e:
        print(f"Payment intent error: {str(e)}")
        return jsonify({'error': str(e)}), 500


@payment_bp.route('/payments/confirm', methods=['POST'])
def confirm_payment():
    """
    Called after Stripe payment succeeds on the frontend.
    Updates the order's payment_status and stores the payment_intent_id.
    """
    try:
        data = request.json
        order_number = data.get('order_number')
        payment_intent_id = data.get('payment_intent_id')

        if not order_number or not payment_intent_id:
            return jsonify({'error': 'Missing order_number or payment_intent_id'}), 400

        # Verify the payment with Stripe
        intent = stripe.PaymentIntent.retrieve(payment_intent_id)
        if intent.status != 'succeeded':
            return jsonify({'error': f'Payment not completed. Status: {intent.status}'}), 400

        # Update order payment status
        order = Order.query.filter_by(order_number=order_number).first()
        if order:
            order.payment_status = 'paid'
            order.payment_method = 'credit_card'
            order.payment_intent_id = payment_intent_id
            order.status = 'confirmed'  # Auto-confirm paid orders
            order.confirmed_at = datetime.utcnow()
            db.session.commit()

        return jsonify({'success': True, 'message': 'Payment confirmed'})

    except stripe.error.StripeError as e:
        return jsonify({'error': str(e.user_message)}), 400
    except Exception as e:
        print(f"Payment confirm error: {str(e)}")
        return jsonify({'error': str(e)}), 500


# ─── Check Image Upload ───────────────────────────────────────────────────────

@payment_bp.route('/payments/upload-check', methods=['POST'])
def upload_check():
    """
    Accepts a check image upload for an order.
    The check image is stored on the server and linked to the order.
    Staff will review it in the internal portal.
    """
    try:
        order_number = request.form.get('order_number')
        if not order_number:
            return jsonify({'error': 'order_number is required'}), 400

        if 'check_image' not in request.files:
            return jsonify({'error': 'No check image provided'}), 400

        file = request.files['check_image']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400

        if not allowed_file(file.filename):
            return jsonify({'error': 'File type not allowed. Please upload a JPG, PNG, or PDF.'}), 400

        # Ensure upload directory exists
        os.makedirs(UPLOAD_FOLDER, exist_ok=True)

        # Save file with order number prefix for easy identification
        ext = file.filename.rsplit('.', 1)[1].lower()
        filename = secure_filename(f"check_{order_number}_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}.{ext}")
        filepath = os.path.join(UPLOAD_FOLDER, filename)
        file.save(filepath)

        # Update order with check image info
        order = Order.query.filter_by(order_number=order_number).first()
        if order:
            order.payment_method = 'check'
            order.check_image_filename = filename
            order.payment_status = 'pending_review'
            db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Check image uploaded successfully. Your order will be confirmed once we review your check.',
            'filename': filename,
        })

    except Exception as e:
        print(f"Check upload error: {str(e)}")
        return jsonify({'error': str(e)}), 500


@payment_bp.route('/staff/checks/<string:order_number>', methods=['GET'])
def get_check_image(order_number):
    """Serve the check image for staff review."""
    from flask import send_from_directory
    order = Order.query.filter_by(order_number=order_number).first_or_404()
    if not order.check_image_filename:
        return jsonify({'error': 'No check image for this order'}), 404
    return send_from_directory(UPLOAD_FOLDER, order.check_image_filename)


@payment_bp.route('/staff/checks/<string:order_number>/approve', methods=['POST'])
def approve_check(order_number):
    """Staff approves a check payment and confirms the order."""
    if 'staff_id' not in session:
        return jsonify({'error': 'Staff authentication required'}), 401
    order = Order.query.filter_by(order_number=order_number).first_or_404()
    order.payment_status = 'paid'
    order.status = 'confirmed'
    order.confirmed_at = datetime.utcnow()
    db.session.commit()
    return jsonify({'success': True, 'message': 'Check approved, order confirmed'})


@payment_bp.route('/staff/checks/<string:order_number>/reject', methods=['POST'])
def reject_check(order_number):
    """Staff rejects a check payment."""
    if 'staff_id' not in session:
        return jsonify({'error': 'Staff authentication required'}), 401
    order = Order.query.filter_by(order_number=order_number).first_or_404()
    order.payment_status = 'rejected'
    order.status = 'cancelled'
    db.session.commit()
    return jsonify({'success': True, 'message': 'Check rejected, order cancelled'})
