# FILE: backend/Dockerfile
# PHOENIX PROTOCOL - INFRASTRUCTURE V5.0 (CLOUD-HYBRID SLIM ENGINE)
# 1. UPGRADE: Swapped base to python:3.13-slim for low memory runtime footprint (<512MB RAM).
# 2. ALIGNMENT: Preserves the "Albanian Vision" OCR features (Tesseract + Albanian Pack).
# 3. STATUS: Production Optimized.

FROM python:3.13-slim

# 1. Set environment variables to optimize Python runtime container behavior
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app

WORKDIR /app

# 2. Install essential system dependencies with clean-up to minimize image size
# Preserves Tesseract-OCR, LibreOffice, and tools for DNS/ping troubleshooting
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    tesseract-ocr \
    tesseract-ocr-sqi \
    libreoffice \
    dnsutils \
    iputils-ping \
    curl \
    build-essential \
    libgomp1 && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# 3. Verify core system tools are correctly mapped
RUN tesseract --version && soffice --version

# 4. Copy requirements first to utilize Docker's cache layer
COPY requirements.txt .

# 5. Install Python dependencies
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# 6. Copy remaining application files
COPY ./app ./app
COPY ./scripts ./scripts

# 7. Expose default port
EXPOSE 8000

# 8. Start-up configuration optimized for lightweight, single-process execution on Render
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]