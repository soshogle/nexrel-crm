#!/bin/bash

# Deploy Orthanc DICOM Server
# This script sets up Orthanc for production deployment

set -e

echo "🚀 Deploying Orthanc DICOM Server..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if docker-compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ docker-compose is not installed. Please install docker-compose first."
    exit 1
fi

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p docker/orthanc/data
mkdir -p docker/orthanc/logs

# Build and start Orthanc
echo "🔨 Building Orthanc container..."
docker-compose -f docker-compose.orthanc.yml build

echo "🚀 Starting Orthanc container..."
docker-compose -f docker-compose.orthanc.yml up -d

# Wait for Orthanc to be ready
echo "⏳ Waiting for Orthanc to be ready..."
sleep 10

# Check if Orthanc is running
if curl -f http://localhost:8042/system > /dev/null 2>&1; then
    echo "✅ Orthanc is running successfully!"
    echo ""
    echo "📋 Orthanc Information:"
    echo "   - DICOM Port: 4242"
    echo "   - HTTP API Port: 8042"
    echo "   - Web Interface: http://localhost:8042"
    echo "   - Default Username: orthanc"
    echo "   - Default Password: orthanc"
    echo ""
    echo "⚠️  IMPORTANT: Change the default password in production!"
    echo ""
    echo "🔗 Next Steps:"
    echo "   1. Configure webhook in Orthanc to point to your API"
    echo "   2. Set environment variables in your Next.js app:"
    echo "      ORTHANC_BASE_URL=http://localhost:8042"
    echo "      ORTHANC_USERNAME=orthanc"
    echo "      ORTHANC_PASSWORD=orthanc"
    echo "      DICOM_WEBHOOK_SECRET=your-secret-key"
    echo "   3. Configure X-ray machines to send to Orthanc"
else
    echo "❌ Orthanc failed to start. Check logs with:"
    echo "   docker-compose -f docker-compose.orthanc.yml logs"
    exit 1
fi
