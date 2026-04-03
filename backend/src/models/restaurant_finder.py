from src.models.user import db
from datetime import datetime


# Supported ethnic/cuisine groups
ETHNIC_GROUPS = [
    'Chinese', 'Japanese', 'Korean', 'Vietnamese', 'Thai', 'Filipino',
    'Indian', 'Pakistani', 'Bangladeshi', 'Nepalese',
    'Mexican', 'Salvadoran', 'Guatemalan', 'Colombian', 'Peruvian', 'Cuban',
    'Italian', 'Greek', 'Spanish', 'French', 'Portuguese',
    'Ethiopian', 'Nigerian', 'Moroccan',
    'Lebanese', 'Turkish', 'Israeli', 'Persian',
    'Caribbean', 'Jamaican', 'Haitian',
    'American', 'Southern', 'BBQ',
    'Other'
]

# East Coast states for initial rollout
EAST_COAST_STATES = [
    'ME', 'NH', 'VT', 'MA', 'RI', 'CT',
    'NY', 'NJ', 'PA', 'DE', 'MD', 'DC',
    'VA', 'WV', 'NC', 'SC', 'GA', 'FL'
]


class RestaurantLead(db.Model):
    """
    Multi-ethnic restaurant lead / prospect database.
    Stores contact info, ownership, hours, and sourcing metadata
    for use by LLD sales reps targeting restaurant owners.
    """
    __tablename__ = 'restaurant_leads'

    id = db.Column(db.Integer, primary_key=True)

    # ── Core Identity ──────────────────────────────────────────────────────────
    name = db.Column(db.String(255), nullable=False)
    dba_name = db.Column(db.String(255), nullable=True)   # "Doing Business As" if different

    # ── Cuisine / Ethnic Group ─────────────────────────────────────────────────
    ethnic_group = db.Column(db.String(100), nullable=False, index=True)
    cuisine_detail = db.Column(db.String(255), nullable=True)  # e.g. "Cantonese", "Sichuan", "Dim Sum"

    # ── Address ────────────────────────────────────────────────────────────────
    address_street = db.Column(db.String(255), nullable=True)
    address_city = db.Column(db.String(100), nullable=True, index=True)
    address_state = db.Column(db.String(2), nullable=True, index=True)
    address_zip = db.Column(db.String(10), nullable=True)
    address_full = db.Column(db.Text, nullable=True)  # full formatted address from source

    # ── Contact ────────────────────────────────────────────────────────────────
    phone = db.Column(db.String(30), nullable=True)
    phone_2 = db.Column(db.String(30), nullable=True)
    email = db.Column(db.String(255), nullable=True)
    website = db.Column(db.String(500), nullable=True)

    # ── Owner / Contact Person ─────────────────────────────────────────────────
    owner_name = db.Column(db.String(255), nullable=True, index=True)
    owner_email = db.Column(db.String(255), nullable=True)
    owner_phone = db.Column(db.String(30), nullable=True)
    contact_title = db.Column(db.String(100), nullable=True)  # e.g. "Owner", "Manager", "GM"

    # ── Hours of Operation (Mon–Sun) ───────────────────────────────────────────
    hours_monday_open = db.Column(db.String(10), nullable=True)    # e.g. "11:00"
    hours_monday_close = db.Column(db.String(10), nullable=True)   # e.g. "22:00"
    hours_tuesday_open = db.Column(db.String(10), nullable=True)
    hours_tuesday_close = db.Column(db.String(10), nullable=True)
    hours_wednesday_open = db.Column(db.String(10), nullable=True)
    hours_wednesday_close = db.Column(db.String(10), nullable=True)
    hours_thursday_open = db.Column(db.String(10), nullable=True)
    hours_thursday_close = db.Column(db.String(10), nullable=True)
    hours_friday_open = db.Column(db.String(10), nullable=True)
    hours_friday_close = db.Column(db.String(10), nullable=True)
    hours_saturday_open = db.Column(db.String(10), nullable=True)
    hours_saturday_close = db.Column(db.String(10), nullable=True)
    hours_sunday_open = db.Column(db.String(10), nullable=True)
    hours_sunday_close = db.Column(db.String(10), nullable=True)
    hours_notes = db.Column(db.String(500), nullable=True)  # e.g. "Closed Tuesdays", "Lunch only"

    # ── Business Details ───────────────────────────────────────────────────────
    google_rating = db.Column(db.Float, nullable=True)
    google_review_count = db.Column(db.Integer, nullable=True)
    google_place_id = db.Column(db.String(255), nullable=True, unique=True)
    yelp_id = db.Column(db.String(255), nullable=True)
    google_maps_url = db.Column(db.String(1000), nullable=True)
    price_level = db.Column(db.String(10), nullable=True)  # "$", "$$", "$$$", "$$$$"
    seating_capacity = db.Column(db.Integer, nullable=True)

    # ── Social Media ───────────────────────────────────────────────────────────
    facebook_url = db.Column(db.String(500), nullable=True)
    instagram_url = db.Column(db.String(500), nullable=True)

    # ── CRM / Sales Status ─────────────────────────────────────────────────────
    lead_status = db.Column(db.String(50), default='new', index=True)
    # Values: new, contacted, interested, not_interested, customer, do_not_contact
    sales_notes = db.Column(db.Text, nullable=True)
    assigned_rep = db.Column(db.String(100), nullable=True)
    last_contacted = db.Column(db.DateTime, nullable=True)
    is_existing_customer = db.Column(db.Boolean, default=False)

    # ── Data Sourcing Metadata ─────────────────────────────────────────────────
    data_source = db.Column(db.String(100), nullable=True)
    # e.g. "Google Maps", "Yelp", "NYC Open Data", "Manual", "Outscraper"
    source_url = db.Column(db.String(1000), nullable=True)
    data_verified = db.Column(db.Boolean, default=False)
    data_verified_at = db.Column(db.DateTime, nullable=True)

    # ── Timestamps ─────────────────────────────────────────────────────────────
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def hours_dict(self):
        """Return hours as a structured dict keyed by day name."""
        days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
        result = {}
        for day in days:
            open_t = getattr(self, f'hours_{day}_open')
            close_t = getattr(self, f'hours_{day}_close')
            if open_t or close_t:
                result[day] = {'open': open_t, 'close': close_t}
            else:
                result[day] = None
        return result

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'dba_name': self.dba_name,
            'ethnic_group': self.ethnic_group,
            'cuisine_detail': self.cuisine_detail,
            'address': {
                'street': self.address_street,
                'city': self.address_city,
                'state': self.address_state,
                'zip': self.address_zip,
                'full': self.address_full,
            },
            'phone': self.phone,
            'phone_2': self.phone_2,
            'email': self.email,
            'website': self.website,
            'owner': {
                'name': self.owner_name,
                'email': self.owner_email,
                'phone': self.owner_phone,
                'title': self.contact_title,
            },
            'hours': self.hours_dict(),
            'hours_notes': self.hours_notes,
            'google_rating': self.google_rating,
            'google_review_count': self.google_review_count,
            'google_place_id': self.google_place_id,
            'google_maps_url': self.google_maps_url,
            'yelp_id': self.yelp_id,
            'price_level': self.price_level,
            'facebook_url': self.facebook_url,
            'instagram_url': self.instagram_url,
            'lead_status': self.lead_status,
            'sales_notes': self.sales_notes,
            'assigned_rep': self.assigned_rep,
            'last_contacted': self.last_contacted.isoformat() if self.last_contacted else None,
            'is_existing_customer': self.is_existing_customer,
            'data_source': self.data_source,
            'data_verified': self.data_verified,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }

    def __repr__(self):
        return f'<RestaurantLead {self.name} ({self.ethnic_group}) - {self.address_city}, {self.address_state}>'
