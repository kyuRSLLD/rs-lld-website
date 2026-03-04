FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create database directory
RUN mkdir -p src/database

# Start the app - PORT is injected by Railway
CMD python src/main.py
