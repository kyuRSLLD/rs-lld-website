"""
Restaurant Finder API
=====================
Endpoints for managing the multi-ethnic restaurant lead database.
Provides CRUD, search/filter, bulk import, Google Maps scraping,
and CSV export for the LLD sales team.

All routes require staff authentication via X-Staff-Token header.
"""

import os
import csv
import io
import json
import requests
from datetime import datetime
from flask import Blueprint, request, jsonify, make_response
from src.models.user import db
from src.models.restaurant_finder import RestaurantLead, ETHNIC_GROUPS, EAST_COAST_STATES

restaurant_finder_bp = Blueprint('restaurant_finder', __name__)

DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

# ── Auth Helper ────────────────────────────────────────────────────────────────

def verify_staff_token():
    """Verify staff JWT token from header."""
    from src.models.order import StaffUser
    import jwt
    token = request.headers.get('X-Staff-Token') or request.headers.get('Authorization', '').replace('Bearer ', '')
    if not token:
        return None
    try:
        secret = os.environ.get('SECRET_KEY', '')
        payload = jwt.decode(token, secret, algorithms=['HS256'])
        staff = StaffUser.query.get(payload.get('staff_id'))
        return staff
    except Exception:
        return None


def staff_required(f):
    from functools import wraps
    @wraps(f)
    def decorated(*args, **kwargs):
        staff = verify_staff_token()
        if not staff:
            return jsonify({'error': 'Staff authentication required'}), 401
        return f(*args, **kwargs)
    return decorated


# ── Metadata Endpoints ─────────────────────────────────────────────────────────

@restaurant_finder_bp.route('/api/restaurants/meta', methods=['GET'])
def get_meta():
    """Return supported ethnic groups, states, and lead statuses."""
    return jsonify({
        'ethnic_groups': ETHNIC_GROUPS,
        'east_coast_states': EAST_COAST_STATES,
        'lead_statuses': ['new', 'contacted', 'interested', 'not_interested', 'customer', 'do_not_contact'],
        'days': DAYS,
    })


# ── List / Search / Filter ─────────────────────────────────────────────────────

@restaurant_finder_bp.route('/api/restaurants', methods=['GET'])
@staff_required
def list_restaurants():
    """
    List restaurants with filtering, search, and pagination.
    Query params:
      - q: text search (name, owner, city)
      - ethnic_group: filter by ethnic group
      - state: filter by state code
      - city: filter by city
      - lead_status: filter by CRM status
      - page: page number (default 1)
      - per_page: results per page (default 50, max 200)
      - sort: field to sort by (default: created_at)
      - order: asc|desc (default: desc)
    """
    q = request.args.get('q', '').strip()
    ethnic_group = request.args.get('ethnic_group', '').strip()
    state = request.args.get('state', '').strip().upper()
    city = request.args.get('city', '').strip()
    lead_status = request.args.get('lead_status', '').strip()
    page = max(1, int(request.args.get('page', 1)))
    per_page = min(200, max(1, int(request.args.get('per_page', 50))))
    sort_field = request.args.get('sort', 'created_at')
    order = request.args.get('order', 'desc')

    query = RestaurantLead.query

    if q:
        like = f'%{q}%'
        query = query.filter(
            db.or_(
                RestaurantLead.name.ilike(like),
                RestaurantLead.owner_name.ilike(like),
                RestaurantLead.address_city.ilike(like),
                RestaurantLead.phone.ilike(like),
                RestaurantLead.email.ilike(like),
            )
        )
    if ethnic_group:
        query = query.filter(RestaurantLead.ethnic_group == ethnic_group)
    if state:
        query = query.filter(RestaurantLead.address_state == state)
    if city:
        query = query.filter(RestaurantLead.address_city.ilike(f'%{city}%'))
    if lead_status:
        query = query.filter(RestaurantLead.lead_status == lead_status)

    # Sorting
    allowed_sorts = {
        'name': RestaurantLead.name,
        'ethnic_group': RestaurantLead.ethnic_group,
        'city': RestaurantLead.address_city,
        'state': RestaurantLead.address_state,
        'owner_name': RestaurantLead.owner_name,
        'lead_status': RestaurantLead.lead_status,
        'created_at': RestaurantLead.created_at,
        'updated_at': RestaurantLead.updated_at,
        'google_rating': RestaurantLead.google_rating,
    }
    sort_col = allowed_sorts.get(sort_field, RestaurantLead.created_at)
    if order == 'asc':
        query = query.order_by(sort_col.asc())
    else:
        query = query.order_by(sort_col.desc())

    total = query.count()
    results = query.offset((page - 1) * per_page).limit(per_page).all()

    return jsonify({
        'total': total,
        'page': page,
        'per_page': per_page,
        'pages': (total + per_page - 1) // per_page,
        'restaurants': [r.to_dict() for r in results],
    })


# ── Get Single Restaurant ──────────────────────────────────────────────────────

@restaurant_finder_bp.route('/api/restaurants/<int:restaurant_id>', methods=['GET'])
@staff_required
def get_restaurant(restaurant_id):
    r = RestaurantLead.query.get_or_404(restaurant_id)
    return jsonify(r.to_dict())


# ── Create Restaurant ──────────────────────────────────────────────────────────

@restaurant_finder_bp.route('/api/restaurants', methods=['POST'])
@staff_required
def create_restaurant():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    if not data.get('name'):
        return jsonify({'error': 'Restaurant name is required'}), 400
    if not data.get('ethnic_group'):
        return jsonify({'error': 'Ethnic group is required'}), 400

    r = RestaurantLead(
        name=data['name'],
        dba_name=data.get('dba_name'),
        ethnic_group=data['ethnic_group'],
        cuisine_detail=data.get('cuisine_detail'),
        address_street=data.get('address_street'),
        address_city=data.get('address_city'),
        address_state=data.get('address_state', '').upper() if data.get('address_state') else None,
        address_zip=data.get('address_zip'),
        address_full=data.get('address_full'),
        phone=data.get('phone'),
        phone_2=data.get('phone_2'),
        email=data.get('email'),
        website=data.get('website'),
        owner_name=data.get('owner_name'),
        owner_email=data.get('owner_email'),
        owner_phone=data.get('owner_phone'),
        contact_title=data.get('contact_title'),
        hours_notes=data.get('hours_notes'),
        google_rating=data.get('google_rating'),
        google_review_count=data.get('google_review_count'),
        google_place_id=data.get('google_place_id'),
        google_maps_url=data.get('google_maps_url'),
        yelp_id=data.get('yelp_id'),
        price_level=data.get('price_level'),
        facebook_url=data.get('facebook_url'),
        instagram_url=data.get('instagram_url'),
        lead_status=data.get('lead_status', 'new'),
        sales_notes=data.get('sales_notes'),
        assigned_rep=data.get('assigned_rep'),
        is_existing_customer=data.get('is_existing_customer', False),
        data_source=data.get('data_source', 'Manual'),
        source_url=data.get('source_url'),
    )

    # Set hours per day
    hours = data.get('hours', {})
    for day in DAYS:
        day_data = hours.get(day) or {}
        setattr(r, f'hours_{day}_open', day_data.get('open'))
        setattr(r, f'hours_{day}_close', day_data.get('close'))

    db.session.add(r)
    db.session.commit()
    return jsonify(r.to_dict()), 201


# ── Update Restaurant ──────────────────────────────────────────────────────────

@restaurant_finder_bp.route('/api/restaurants/<int:restaurant_id>', methods=['PUT', 'PATCH'])
@staff_required
def update_restaurant(restaurant_id):
    r = RestaurantLead.query.get_or_404(restaurant_id)
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    fields = [
        'name', 'dba_name', 'ethnic_group', 'cuisine_detail',
        'address_street', 'address_city', 'address_zip', 'address_full',
        'phone', 'phone_2', 'email', 'website',
        'owner_name', 'owner_email', 'owner_phone', 'contact_title',
        'hours_notes', 'google_rating', 'google_review_count',
        'google_place_id', 'google_maps_url', 'yelp_id', 'price_level',
        'facebook_url', 'instagram_url', 'lead_status', 'sales_notes',
        'assigned_rep', 'is_existing_customer', 'data_source', 'source_url',
        'data_verified',
    ]
    for field in fields:
        if field in data:
            setattr(r, field, data[field])

    if 'address_state' in data and data['address_state']:
        r.address_state = data['address_state'].upper()

    if 'hours' in data:
        for day in DAYS:
            day_data = (data['hours'] or {}).get(day) or {}
            setattr(r, f'hours_{day}_open', day_data.get('open'))
            setattr(r, f'hours_{day}_close', day_data.get('close'))

    if 'last_contacted' in data and data['last_contacted']:
        try:
            r.last_contacted = datetime.fromisoformat(data['last_contacted'])
        except Exception:
            pass

    if data.get('data_verified'):
        r.data_verified_at = datetime.utcnow()

    r.updated_at = datetime.utcnow()
    db.session.commit()
    return jsonify(r.to_dict())


# ── Delete Restaurant ──────────────────────────────────────────────────────────

@restaurant_finder_bp.route('/api/restaurants/<int:restaurant_id>', methods=['DELETE'])
@staff_required
def delete_restaurant(restaurant_id):
    r = RestaurantLead.query.get_or_404(restaurant_id)
    db.session.delete(r)
    db.session.commit()
    return jsonify({'success': True, 'id': restaurant_id})


# ── Bulk Delete ────────────────────────────────────────────────────────────────

@restaurant_finder_bp.route('/api/restaurants/bulk-delete', methods=['POST'])
@staff_required
def bulk_delete():
    data = request.get_json()
    ids = data.get('ids', [])
    if not ids:
        return jsonify({'error': 'No IDs provided'}), 400
    deleted = RestaurantLead.query.filter(RestaurantLead.id.in_(ids)).delete(synchronize_session=False)
    db.session.commit()
    return jsonify({'success': True, 'deleted': deleted})


# ── Statistics ─────────────────────────────────────────────────────────────────

@restaurant_finder_bp.route('/api/restaurants/stats', methods=['GET'])
@staff_required
def get_stats():
    """Return summary statistics for the restaurant database."""
    total = RestaurantLead.query.count()

    # By ethnic group
    by_group = db.session.query(
        RestaurantLead.ethnic_group,
        db.func.count(RestaurantLead.id)
    ).group_by(RestaurantLead.ethnic_group).order_by(db.func.count(RestaurantLead.id).desc()).all()

    # By state
    by_state = db.session.query(
        RestaurantLead.address_state,
        db.func.count(RestaurantLead.id)
    ).filter(RestaurantLead.address_state.isnot(None)).group_by(
        RestaurantLead.address_state
    ).order_by(db.func.count(RestaurantLead.id).desc()).all()

    # By lead status
    by_status = db.session.query(
        RestaurantLead.lead_status,
        db.func.count(RestaurantLead.id)
    ).group_by(RestaurantLead.lead_status).all()

    return jsonify({
        'total': total,
        'by_ethnic_group': [{'group': g, 'count': c} for g, c in by_group],
        'by_state': [{'state': s, 'count': c} for s, c in by_state],
        'by_lead_status': [{'status': s, 'count': c} for s, c in by_status],
        'with_owner_name': RestaurantLead.query.filter(RestaurantLead.owner_name.isnot(None)).count(),
        'with_phone': RestaurantLead.query.filter(RestaurantLead.phone.isnot(None)).count(),
        'with_hours': RestaurantLead.query.filter(RestaurantLead.hours_monday_open.isnot(None)).count(),
        'verified': RestaurantLead.query.filter(RestaurantLead.data_verified == True).count(),
    })


# ── CSV Export ─────────────────────────────────────────────────────────────────

@restaurant_finder_bp.route('/api/restaurants/export/csv', methods=['GET'])
@staff_required
def export_csv():
    """Export filtered restaurants to CSV."""
    ethnic_group = request.args.get('ethnic_group', '').strip()
    state = request.args.get('state', '').strip().upper()
    lead_status = request.args.get('lead_status', '').strip()

    query = RestaurantLead.query
    if ethnic_group:
        query = query.filter(RestaurantLead.ethnic_group == ethnic_group)
    if state:
        query = query.filter(RestaurantLead.address_state == state)
    if lead_status:
        query = query.filter(RestaurantLead.lead_status == lead_status)

    restaurants = query.order_by(RestaurantLead.address_state, RestaurantLead.address_city, RestaurantLead.name).all()

    output = io.StringIO()
    writer = csv.writer(output)

    # Header row
    writer.writerow([
        'ID', 'Name', 'DBA Name', 'Ethnic Group', 'Cuisine Detail',
        'Street', 'City', 'State', 'ZIP',
        'Phone', 'Phone 2', 'Email', 'Website',
        'Owner Name', 'Owner Email', 'Owner Phone', 'Contact Title',
        'Mon Open', 'Mon Close', 'Tue Open', 'Tue Close',
        'Wed Open', 'Wed Close', 'Thu Open', 'Thu Close',
        'Fri Open', 'Fri Close', 'Sat Open', 'Sat Close',
        'Sun Open', 'Sun Close', 'Hours Notes',
        'Google Rating', 'Review Count', 'Price Level',
        'Lead Status', 'Assigned Rep', 'Sales Notes',
        'Data Source', 'Data Verified', 'Created At'
    ])

    for r in restaurants:
        writer.writerow([
            r.id, r.name, r.dba_name or '', r.ethnic_group, r.cuisine_detail or '',
            r.address_street or '', r.address_city or '', r.address_state or '', r.address_zip or '',
            r.phone or '', r.phone_2 or '', r.email or '', r.website or '',
            r.owner_name or '', r.owner_email or '', r.owner_phone or '', r.contact_title or '',
            r.hours_monday_open or '', r.hours_monday_close or '',
            r.hours_tuesday_open or '', r.hours_tuesday_close or '',
            r.hours_wednesday_open or '', r.hours_wednesday_close or '',
            r.hours_thursday_open or '', r.hours_thursday_close or '',
            r.hours_friday_open or '', r.hours_friday_close or '',
            r.hours_saturday_open or '', r.hours_saturday_close or '',
            r.hours_sunday_open or '', r.hours_sunday_close or '',
            r.hours_notes or '',
            r.google_rating or '', r.google_review_count or '', r.price_level or '',
            r.lead_status or '', r.assigned_rep or '', r.sales_notes or '',
            r.data_source or '', 'Yes' if r.data_verified else 'No',
            r.created_at.strftime('%Y-%m-%d') if r.created_at else ''
        ])

    output.seek(0)
    filename = f'restaurants_{ethnic_group or "all"}_{state or "all"}_{datetime.now().strftime("%Y%m%d")}.csv'
    response = make_response(output.getvalue())
    response.headers['Content-Type'] = 'text/csv'
    response.headers['Content-Disposition'] = f'attachment; filename="{filename}"'
    return response


# ── Bulk Import (JSON) ─────────────────────────────────────────────────────────

@restaurant_finder_bp.route('/api/restaurants/import', methods=['POST'])
@staff_required
def bulk_import():
    """
    Bulk import restaurants from JSON array.
    Skips duplicates based on google_place_id or (name + address_zip).
    Returns count of imported vs skipped.
    """
    data = request.get_json()
    if not data or not isinstance(data, list):
        return jsonify({'error': 'Expected a JSON array of restaurant objects'}), 400

    imported = 0
    skipped = 0
    errors = []

    for i, item in enumerate(data):
        try:
            # Dedup check
            place_id = item.get('google_place_id')
            if place_id:
                existing = RestaurantLead.query.filter_by(google_place_id=place_id).first()
                if existing:
                    skipped += 1
                    continue
            else:
                name = item.get('name', '').strip()
                zipcode = item.get('address_zip', '').strip()
                if name and zipcode:
                    existing = RestaurantLead.query.filter_by(name=name, address_zip=zipcode).first()
                    if existing:
                        skipped += 1
                        continue

            r = RestaurantLead(
                name=item.get('name', 'Unknown'),
                dba_name=item.get('dba_name'),
                ethnic_group=item.get('ethnic_group', 'Other'),
                cuisine_detail=item.get('cuisine_detail'),
                address_street=item.get('address_street'),
                address_city=item.get('address_city'),
                address_state=(item.get('address_state') or '').upper() or None,
                address_zip=item.get('address_zip'),
                address_full=item.get('address_full'),
                phone=item.get('phone'),
                phone_2=item.get('phone_2'),
                email=item.get('email'),
                website=item.get('website'),
                owner_name=item.get('owner_name'),
                owner_email=item.get('owner_email'),
                owner_phone=item.get('owner_phone'),
                contact_title=item.get('contact_title'),
                hours_notes=item.get('hours_notes'),
                google_rating=item.get('google_rating'),
                google_review_count=item.get('google_review_count'),
                google_place_id=item.get('google_place_id'),
                google_maps_url=item.get('google_maps_url'),
                yelp_id=item.get('yelp_id'),
                price_level=item.get('price_level'),
                facebook_url=item.get('facebook_url'),
                instagram_url=item.get('instagram_url'),
                lead_status=item.get('lead_status', 'new'),
                sales_notes=item.get('sales_notes'),
                assigned_rep=item.get('assigned_rep'),
                is_existing_customer=item.get('is_existing_customer', False),
                data_source=item.get('data_source', 'Import'),
                source_url=item.get('source_url'),
            )

            hours = item.get('hours', {}) or {}
            for day in DAYS:
                day_data = hours.get(day) or {}
                setattr(r, f'hours_{day}_open', day_data.get('open'))
                setattr(r, f'hours_{day}_close', day_data.get('close'))

            db.session.add(r)
            imported += 1

        except Exception as e:
            errors.append({'index': i, 'error': str(e)})

    db.session.commit()
    return jsonify({
        'success': True,
        'imported': imported,
        'skipped': skipped,
        'errors': errors,
    })


# ── Google Maps Scrape (via Outscraper) ────────────────────────────────────────

@restaurant_finder_bp.route('/api/restaurants/scrape', methods=['POST'])
@staff_required
def scrape_restaurants():
    """
    Trigger a Google Maps scrape via Outscraper API.
    Body params:
      - ethnic_group: e.g. "Chinese"
      - city: e.g. "New York"
      - state: e.g. "NY"
      - limit: max results (default 50)
    Requires OUTSCRAPER_API_KEY env var.
    """
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    ethnic_group = data.get('ethnic_group', 'Chinese')
    city = data.get('city', '')
    state = data.get('state', '')
    limit = min(500, max(1, int(data.get('limit', 50))))

    api_key = os.environ.get('OUTSCRAPER_API_KEY')
    if not api_key:
        return jsonify({
            'error': 'OUTSCRAPER_API_KEY not configured',
            'message': 'Add OUTSCRAPER_API_KEY to Railway environment variables to enable scraping.',
            'setup_url': 'https://outscraper.com'
        }), 503

    location = f'{city}, {state}' if city and state else (city or state or 'New York, NY')
    query = f'{ethnic_group} restaurant'

    try:
        resp = requests.get(
            'https://api.app.outscraper.com/maps/search-v3',
            params={
                'query': f'{query} {location}',
                'limit': limit,
                'language': 'en',
                'fields': 'name,full_address,street,city,state,postal_code,phone,site,type,subtypes,rating,reviews,place_id,google_id,working_hours,owner_name,owner_id,price_level,latitude,longitude',
            },
            headers={'X-API-KEY': api_key},
            timeout=120
        )
        resp.raise_for_status()
        result = resp.json()
    except requests.exceptions.Timeout:
        return jsonify({'error': 'Scrape request timed out. Try a smaller limit.'}), 504
    except requests.exceptions.RequestException as e:
        return jsonify({'error': f'Scrape API error: {str(e)}'}), 502

    # Parse and import results
    places = result.get('data', [])
    if isinstance(places, list) and len(places) > 0 and isinstance(places[0], list):
        places = places[0]  # Outscraper wraps in nested array

    imported = 0
    skipped = 0

    for place in places:
        try:
            place_id = place.get('place_id') or place.get('google_id')

            # Dedup check
            if place_id:
                existing = RestaurantLead.query.filter_by(google_place_id=place_id).first()
                if existing:
                    skipped += 1
                    continue

            # Parse working hours
            working_hours = place.get('working_hours') or {}
            hours_map = {}
            day_map = {
                'Monday': 'monday', 'Tuesday': 'tuesday', 'Wednesday': 'wednesday',
                'Thursday': 'thursday', 'Friday': 'friday', 'Saturday': 'saturday', 'Sunday': 'sunday'
            }
            for day_name, day_key in day_map.items():
                raw = working_hours.get(day_name, '')
                if raw and raw.lower() not in ('closed', ''):
                    parts = raw.replace('\u2013', '-').split('-')
                    if len(parts) == 2:
                        hours_map[day_key] = {
                            'open': parts[0].strip(),
                            'close': parts[1].strip()
                        }
                    else:
                        hours_map[day_key] = {'open': raw.strip(), 'close': ''}
                else:
                    hours_map[day_key] = None

            r = RestaurantLead(
                name=place.get('name', 'Unknown'),
                ethnic_group=ethnic_group,
                cuisine_detail=place.get('type') or place.get('subtypes', ''),
                address_street=place.get('street'),
                address_city=place.get('city'),
                address_state=(place.get('state') or '').upper() or None,
                address_zip=place.get('postal_code'),
                address_full=place.get('full_address'),
                phone=place.get('phone'),
                website=place.get('site'),
                owner_name=place.get('owner_name'),
                google_rating=place.get('rating'),
                google_review_count=place.get('reviews'),
                google_place_id=place_id,
                google_maps_url=f"https://www.google.com/maps/place/?q=place_id:{place_id}" if place_id else None,
                price_level=place.get('price_level'),
                lead_status='new',
                data_source='Google Maps (Outscraper)',
            )

            for day_key, val in hours_map.items():
                if val:
                    setattr(r, f'hours_{day_key}_open', val.get('open'))
                    setattr(r, f'hours_{day_key}_close', val.get('close'))

            db.session.add(r)
            imported += 1

        except Exception:
            skipped += 1

    db.session.commit()

    return jsonify({
        'success': True,
        'query': f'{query} in {location}',
        'total_found': len(places),
        'imported': imported,
        'skipped_duplicates': skipped,
    })
