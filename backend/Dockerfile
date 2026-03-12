# ── Single stage: Python backend with pre-built frontend ──────────────────────
FROM python:3.11-slim

WORKDIR /app

# Install poppler-utils for pdf2image (Bill Analyzer feature)
RUN apt-get update && apt-get install -y --no-install-recommends \
    poppler-utils \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source
COPY backend/ .

# Copy pre-built frontend static files into Flask static folder
# (frontend is built locally and committed to backend/src/static/)
# The static files are already in place from the COPY backend/ above.

# Create database directory
RUN mkdir -p src/database

# Start the app — gunicorn is used in production via railway.toml startCommand
CMD python src/main.py
