FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip3 install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create database directory
RUN mkdir -p src/database

# Start with gunicorn using PORT env var from Railway
CMD gunicorn --bind 0.0.0.0:${PORT:-8080} --workers 2 --timeout 120 src.main:app
