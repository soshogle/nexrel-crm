#!/bin/bash

# Setup Docker and Start Orthanc Locally
# This script checks for Docker and provides installation instructions

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo ""
echo -e "${BLUE}🐳 Docker & Orthanc Setup${NC}"
echo ""

# Check if Docker is installed
if command -v docker &> /dev/null; then
    echo -e "${GREEN}✅ Docker is installed${NC}"
    docker --version
    
    # Check if Docker daemon is running
    if docker ps &> /dev/null; then
        echo -e "${GREEN}✅ Docker daemon is running${NC}"
        DOCKER_READY=true
    else
        echo -e "${YELLOW}⚠️  Docker daemon is not running${NC}"
        echo ""
        echo "Starting Docker Desktop..."
        if [ -d "/Applications/Docker.app" ]; then
            open -a Docker
            echo "Waiting for Docker to start (this may take 30-60 seconds)..."
            sleep 5
            
            # Wait for Docker to be ready (max 60 seconds)
            for i in {1..12}; do
                if docker ps &> /dev/null; then
                    echo -e "${GREEN}✅ Docker is now running${NC}"
                    DOCKER_READY=true
                    break
                fi
                echo "   Waiting... ($i/12)"
                sleep 5
            done
            
            if [ "$DOCKER_READY" != "true" ]; then
                echo -e "${RED}❌ Docker did not start. Please start Docker Desktop manually.${NC}"
                exit 1
            fi
        else
            echo -e "${RED}❌ Docker Desktop not found. Please install Docker Desktop first.${NC}"
            exit 1
        fi
    fi
else
    echo -e "${YELLOW}⚠️  Docker is not installed${NC}"
    echo ""
    echo "To install Docker Desktop on macOS:"
    echo ""
    echo "Option 1: Using Homebrew (recommended)"
    echo "  brew install --cask docker"
    echo ""
    echo "Option 2: Download directly"
    echo "  Visit: https://www.docker.com/products/docker-desktop/"
    echo "  Download Docker Desktop for Mac"
    echo "  Install and start Docker Desktop"
    echo ""
    echo "After installation, run this script again:"
    echo "  ./scripts/setup-docker-and-orthanc.sh"
    echo ""
    exit 1
fi

# Now start Orthanc
if [ "$DOCKER_READY" = "true" ]; then
    echo ""
    echo -e "${BLUE}🚀 Starting Orthanc...${NC}"
    echo ""
    
    # Check if Orthanc is already running
    if docker ps | grep -q nexrel-orthanc; then
        echo -e "${GREEN}✅ Orthanc is already running${NC}"
    else
        # Start Orthanc using docker-compose
        if command -v docker-compose &> /dev/null; then
            docker-compose -f docker-compose.orthanc.yml up -d
        elif docker compose version &> /dev/null; then
            docker compose -f docker-compose.orthanc.yml up -d
        else
            echo -e "${RED}❌ docker-compose not found${NC}"
            exit 1
        fi
        
        echo "Waiting for Orthanc to start..."
        sleep 5
    fi
    
    # Verify Orthanc is running
    if curl -sf http://localhost:8042/system > /dev/null 2>&1; then
        echo ""
        echo -e "${GREEN}✅ Orthanc is running!${NC}"
        echo ""
        echo "📋 Access Orthanc:"
        echo "   Web Interface: http://localhost:8042"
        echo "   Username: orthanc"
        echo "   Password: orthanc"
        echo ""
        echo "📋 DICOM Port:"
        echo "   Port: 4242"
        echo "   AE Title: NEXREL-CRM"
        echo ""
        
        # Show Orthanc version
        ORTHANC_VERSION=$(curl -sf -u orthanc:orthanc http://localhost:8042/system | grep -o '"Version":"[^"]*"' | cut -d'"' -f4 || echo "unknown")
        echo "   Version: $ORTHANC_VERSION"
        echo ""
        
        echo -e "${GREEN}✅ Setup complete!${NC}"
        echo ""
        echo "Next steps:"
        echo "1. Start Next.js app: npm run dev"
        echo "2. Run tests: ./scripts/test-dicom-complete.sh"
        echo "3. Open: http://localhost:3000/dashboard/dental-test"
        echo ""
    else
        echo -e "${YELLOW}⚠️  Orthanc may still be starting...${NC}"
        echo "Check logs: docker logs nexrel-orthanc"
        echo ""
        echo "Or check manually:"
        echo "  curl http://localhost:8042/system -u orthanc:orthanc"
    fi
fi
