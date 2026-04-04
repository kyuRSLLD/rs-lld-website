# LLD Restaurant Supply — Restaurant Finder API

**Version:** 1.0  
**Base URL:** `https://rs-lld-website-production.up.railway.app/api/restaurants`  
**Authentication:** Staff JWT Token via `X-Staff-Token` header OR Internal API Key via `X-Internal-Key` header

---

## Authentication

The Restaurant Finder API is protected and requires authentication. There are two ways to authenticate:

### 1. Staff JWT Token (Frontend)
Used by the React frontend Staff Portal.
```http
X-Staff-Token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 2. Internal API Key (Server-to-Server / Scripts)
Used for automated scripts, batch scraping, or external integrations.
```http
X-Internal-Key: your-internal-api-key-here
```
The internal key is set via the `INTERNAL_API_KEY` environment variable on the Railway backend.

---

## Endpoints Overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/restaurants/meta` | Get supported ethnic groups, states, and statuses |
| `GET` | `/api/restaurants` | List/search restaurants with pagination and filters |
| `GET` | `/api/restaurants/{id}` | Get a single restaurant by ID |
| `POST` | `/api/restaurants` | Create a new restaurant lead manually |
| `PUT` | `/api/restaurants/{id}` | Update an existing restaurant lead |
| `DELETE` | `/api/restaurants/{id}` | Delete a single restaurant lead |
| `POST` | `/api/restaurants/bulk-delete` | Delete multiple restaurants by ID |
| `POST` | `/api/restaurants/scrape` | Trigger Google Maps scrape via Outscraper |
| `POST` | `/api/restaurants/import` | Bulk import restaurants from JSON |
| `GET` | `/api/restaurants/export/csv` | Export filtered restaurants to CSV |

---

## Endpoints

### GET `/api/restaurants/meta`
Returns the lists of supported ethnic groups, East Coast states, lead statuses, and days of the week. No auth required.

**Response:**
```json
{
  "days": ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"],
  "east_coast_states": ["ME", "NH", "VT", "MA", "RI", "CT", "NY", "NJ", "PA", "DE", "MD", "DC", "VA", "WV", "NC", "SC", "GA", "FL"],
  "ethnic_groups": ["Chinese", "Japanese", "Korean", "Vietnamese", "Thai", "Filipino", "Indian", "Mexican", "Italian", "..."],
  "lead_statuses": ["new", "contacted", "interested", "not_interested", "customer", "do_not_contact"]
}
```

---

### GET `/api/restaurants`
List all restaurants with optional filtering, search, and pagination.

**Query Parameters:**
- `q`: Text search (matches name, owner, city, phone, email)
- `ethnic_group`: Filter by ethnic group (e.g., "Chinese")
- `state`: Filter by 2-letter state code (e.g., "NY")
- `city`: Filter by city name
- `lead_status`: Filter by CRM status (e.g., "new")
- `page`: Page number (default: 1)
- `per_page`: Results per page (default: 50, max: 200)
- `sort`: Field to sort by (default: `created_at`)
- `order`: `asc` or `desc` (default: `desc`)

**Example Request:**
```bash
curl -H "X-Internal-Key: YOUR_INTERNAL_KEY" \
  "https://rs-lld-website-production.up.railway.app/api/restaurants?ethnic_group=Chinese&state=NY&per_page=10"
```

---

### POST `/api/restaurants/scrape`
Trigger a live Google Maps scrape using the Outscraper API. Results are automatically parsed, deduplicated, and saved to the database.

**Requires:** `OUTSCRAPER_API_KEY` environment variable set on the Railway backend.

**Request Body (JSON):**
| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `ethnic_group` | string | `"Chinese"` | The ethnic group to search for |
| `city` | string | `""` | Target city |
| `state` | string | `""` | Target state (2-letter code) |
| `limit` | integer | `50` | Max results to fetch from Google Maps (max 500) |
| `enrich_contacts` | boolean | `false` | If true, visits websites to find owner name/email (uses extra credits) |
| `max_price_level` | integer | `3` | Max price level to include (1=$, 2=$$, 3=$$$, 4=$$$$). Default 3 excludes $$$$ |

**Example Request:**
```bash
curl -X POST -H "X-Internal-Key: YOUR_INTERNAL_KEY" -H "Content-Type: application/json" \
  -d '{
    "ethnic_group": "Chinese",
    "city": "New York",
    "state": "NY",
    "limit": 50,
    "enrich_contacts": false,
    "max_price_level": 3
  }' \
  "https://rs-lld-website-production.up.railway.app/api/restaurants/scrape"
```

**Response:**
```json
{
  "success": true,
  "query": "Chinese restaurant in New York, NY",
  "total_found": 50,
  "imported": 42,
  "skipped_duplicates": 8,
  "errors": 0,
  "enrichment_enabled": false
}
```

---

### GET `/api/restaurants/export/csv`
Export the restaurant database to a CSV file. Accepts the exact same query parameters as the `GET /api/restaurants` list endpoint to filter the export.

**Example Request:**
```bash
curl -H "X-Internal-Key: YOUR_INTERNAL_KEY" \
  "https://rs-lld-website-production.up.railway.app/api/restaurants/export/csv?ethnic_group=Chinese" > chinese_restaurants.csv
```

---

## Required Environment Variables

To fully utilize the Restaurant Finder API, the following environment variables must be set on the Railway backend:

1. `OUTSCRAPER_API_KEY` — Required for the `/scrape` endpoint. Get this from [app.outscraper.com](https://app.outscraper.com).
2. `INTERNAL_API_KEY` — Required for server-to-server authentication (e.g., batch scraping scripts). Generate a secure random string for this value.
