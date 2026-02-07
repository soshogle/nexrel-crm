#!/bin/bash

# Start Orthanc Locally for Testing
# No VPS needed - runs on your computer

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo ""
echo -e "${BLUE}🚀 Starting Orthanc for Local Testing${NC}"
echo ""

# Check Docker
if ! command -v docker &> /dev/null; then
    echo -e "${YELLOW}❌ Docker not found. Install Docker first:${NC}"
    echo "   https://docs.docker.com/get-docker/"
    exit 1
fi

# Start Orthanc
echo -e "${GREEN}Starting Orthanc container...${NC}"
if command -v docker-compose &> /dev/null; then
    docker-compose -f docker-compose.orthanc.yml up -d
else
    docker compose -f docker-compose.orthanc.yml up -d
fi

# Wait for Orthanc
echo "Waiting for Orthanc to start..."
sleep 5

# Check if running
if curl -sf http://localhost:8042/system > /dev/null 2>&1; then
    echo ""
    echo -e "${GREEN}✅ Orthanc is running!${NC}"
    echo ""
    echo "📋 Access Orthanc:"
    echo "   Web Interface: http://localhost:8042"
    echo "   Username: orthanc"
    echo "   Password: orthanc"
    echo ""
    echo "📋 Test Upload:"
    echo "   curl -X POST http://localhost:8042/instances \\"
    echo "     -u orthanc:orthanc \\"
    echo "     -F file=@test-file.dcm"
    echo ""
else
    echo -e "${YELLOW}⚠️  Orthanc may still be starting. Check logs:${NC}"
    echo "   docker logs nexrel-orthanc"
fi
