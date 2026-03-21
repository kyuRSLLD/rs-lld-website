from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime

db = SQLAlchemy()

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=True)   # nullable for social-only accounts
    company_name = db.Column(db.String(200), nullable=True)
    phone = db.Column(db.String(20), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    is_active = db.Column(db.Boolean, default=True)
    # Password reset
    reset_token = db.Column(db.String(100), nullable=True, unique=True)
    reset_token_expires = db.Column(db.DateTime, nullable=True)

    # Address fields — blank at signup, populated from checkout
    shipping_address = db.Column(db.Text, nullable=True)  # most recent shipping address used
    billing_address = db.Column(db.Text, nullable=True)   # most recent billing address used

    # Account standing / credit terms (set by staff)
    approved_for_terms = db.Column(db.Boolean, default=False)   # Net-30 / Net-60 approved
    credit_limit = db.Column(db.Float, default=0.0)             # Max outstanding balance allowed
    payment_terms = db.Column(db.String(20), nullable=True)     # 'net30', 'net60', 'cod', etc.
    credit_notes = db.Column(db.Text, nullable=True)            # Internal staff notes on credit

    # Social OAuth fields
    oauth_provider = db.Column(db.String(20), nullable=True)   # 'google' | 'facebook' | 'twitter'
    oauth_id = db.Column(db.String(255), nullable=True)         # provider's user ID
    avatar_url = db.Column(db.String(500), nullable=True)       # profile picture URL

    def __repr__(self):
        return f'<User {self.username}>'

    def set_password(self, password):
        if password:
            self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        if not self.password_hash:
            return False
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'company_name': self.company_name,
            'phone': self.phone,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'is_active': self.is_active,
            'shipping_address': self.shipping_address,
            'billing_address': self.billing_address,
            'oauth_provider': self.oauth_provider,
            'avatar_url': self.avatar_url,
            'approved_for_terms': self.approved_for_terms,
            'credit_limit': self.credit_limit,
            'payment_terms': self.payment_terms,
        }
