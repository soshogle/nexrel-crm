#!/bin/bash

# Production Orthanc Deployment Script
# This script guides you through deploying Orthanc for production

set -e

echo "🚀 Orthanc Production Deployment Setup"
echo "========================================"
echo ""

# Check prerequisites
echo "📋 Checking prerequisites..."

if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed."
    echo "   Install Docker: https://docs.docker.com/get-docker/"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ docker-compose is not installed."
    echo "   Install docker-compose: https://docs.docker.com/compose/install/"
    exit 1
fi

echo "✅ Docker and docker-compose are installed"
echo ""

# Get deployment information
echo "📝 Please provide the following information:"
echo ""

read -p "Enter your domain name (e.g., orthanc.yourdomain.com): " ORTHANC_DOMAIN
read -p "Enter your API domain (e.g., api.yourdomain.com or your-app.vercel.app): " API_DOMAIN
read -p "Enter a secure password for Orthanc (or press Enter for random): " ORTHANC_PASSWORD

if [ -z "$ORTHANC_PASSWORD" ]; then
    ORTHANC_PASSWORD=$(openssl rand -base64 32)
    echo "Generated password: $ORTHANC_PASSWORD"
fi

read -p "Enter webhook secret (or press Enter for random): " WEBHOOK_SECRET
if [ -z "$WEBHOOK_SECRET" ]; then
    WEBHOOK_SECRET=$(openssl rand -base64 32)
    echo "Generated webhook secret: $WEBHOOK_SECRET"
fi

echo ""
echo "📋 Configuration Summary:"
echo "   Orthanc Domain: $ORTHANC_DOMAIN"
echo "   API Domain: $API_DOMAIN"
echo "   Orthanc Password: $ORTHANC_PASSWORD"
echo "   Webhook Secret: $WEBHOOK_SECRET"
echo ""

read -p "Continue with deployment? (y/n): " CONFIRM
if [ "$CONFIRM" != "y" ]; then
    echo "Deployment cancelled."
    exit 0
fi

# Create production configuration
echo ""
echo "🔧 Creating production configuration..."

# Update docker-compose with production settings
cat > docker-compose.orthanc.prod.yml <<EOF
version: '3.8'

services:
  orthanc:
    build:
      context: ./docker/orthanc
      dockerfile: Dockerfile
    container_name: nexrel-orthanc-prod
    ports:
      - "4242:4242"  # DICOM port
      - "8042:8042"  # HTTP REST API port
    volumes:
      - orthanc-data-prod:/var/lib/orthanc/db
      - ./docker/orthanc/orthanc.json:/etc/orthanc/orthanc.json:ro
    environment:
      - ORTHANC_NAME=Nexrel CRM DICOM Server
      - ORTHANC_DICOM_AET=NEXREL-CRM
      - ORTHANC_DICOM_PORT=4242
      - ORTHANC_HTTP_PORT=8042
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8042/system"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    networks:
      - dicom-network-prod

volumes:
  orthanc-data-prod:
    driver: local

networks:
  dicom-network-prod:
    driver: bridge
EOF

# Create environment file
cat > .env.orthanc.production <<EOF
# Production Orthanc Configuration
# Generated: $(date)

ORTHANC_BASE_URL=https://$ORTHANC_DOMAIN
ORTHANC_USERNAME=orthanc
ORTHANC_PASSWORD=$ORTHANC_PASSWORD
DICOM_WEBHOOK_SECRET=$WEBHOOK_SECRET
DICOM_AE_TITLE=NEXREL-CRM
ORTHANC_HOST=$ORTHANC_DOMAIN
ORTHANC_PORT=4242

# API Webhook URL
DICOM_WEBHOOK_URL=https://$API_DOMAIN/api/dental/dicom/webhook
EOF

echo "✅ Configuration files created"
echo ""

# Deploy Orthanc
echo "🚀 Deploying Orthanc..."
docker-compose -f docker-compose.orthanc.prod.yml build
docker-compose -f docker-compose.orthanc.prod.yml up -d

echo ""
echo "⏳ Waiting for Orthanc to start..."
sleep 15

# Check if Orthanc is running
if curl -f -u "orthanc:$ORTHANC_PASSWORD" http://localhost:8042/system > /dev/null 2>&1; then
    echo "✅ Orthanc is running!"
else
    echo "❌ Orthanc failed to start. Check logs:"
    echo "   docker-compose -f docker-compose.orthanc.prod.yml logs"
    exit 1
fi

# Create Nginx configuration template
cat > nginx-orthanc.conf <<EOF
# Nginx configuration for Orthanc
# Place this in /etc/nginx/sites-available/orthanc

server {
    listen 80;
    server_name $ORTHANC_DOMAIN;

    location / {
        proxy_pass http://localhost:8042;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

echo ""
echo "✅ Deployment Complete!"
echo ""
echo "📋 Next Steps:"
echo ""
echo "1. Set up Nginx reverse proxy:"
echo "   sudo cp nginx-orthanc.conf /etc/nginx/sites-available/orthanc"
echo "   sudo ln -s /etc/nginx/sites-available/orthanc /etc/nginx/sites-enabled/"
echo "   sudo nginx -t"
echo "   sudo systemctl reload nginx"
echo ""
echo "2. Set up SSL (Let's Encrypt):"
echo "   sudo certbot --nginx -d $ORTHANC_DOMAIN"
echo ""
echo "3. Configure webhook in Orthanc:"
echo "   Access: https://$ORTHANC_DOMAIN"
echo "   Login: orthanc / $ORTHANC_PASSWORD"
echo "   Webhook URL: https://$API_DOMAIN/api/dental/dicom/webhook"
echo "   Webhook Secret: $WEBHOOK_SECRET"
echo ""
echo "4. Add environment variables to Vercel:"
echo "   See .env.orthanc.production file for values"
echo ""
echo "📄 Configuration saved to:"
echo "   - .env.orthanc.production (environment variables)"
echo "   - nginx-orthanc.conf (Nginx configuration)"
echo "   - docker-compose.orthanc.prod.yml (Docker Compose)"
echo ""
