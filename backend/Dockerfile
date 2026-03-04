FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create database directory
RUN mkdir -p src/database

# Expose port
EXPOSE 8080

# Start with gunicorn
CMD gunicorn --bind 0.0.0.0:${PORT:-8080} --workers 2 --timeout 120 src.main:app
