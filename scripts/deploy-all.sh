#!/bin/bash

# Master Deployment Script
# Deploys Orthanc, configures webhook, and tests integration

set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print colored output
print_success() { echo -e "${GREEN}✅ $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
print_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
print_header() { echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"; echo -e "${BLUE}$1${NC}"; echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"; }

# Configuration file
CONFIG_FILE=".deployment-config.json"

# Load or create configuration
load_config() {
    if [ -f "$CONFIG_FILE" ]; then
        if command -v jq &> /dev/null; then
            ORTHANC_DOMAIN=$(jq -r '.orthanc_domain' "$CONFIG_FILE")
            API_DOMAIN=$(jq -r '.api_domain' "$CONFIG_FILE")
            ORTHANC_PASSWORD=$(jq -r '.orthanc_password' "$CONFIG_FILE")
            WEBHOOK_SECRET=$(jq -r '.webhook_secret' "$CONFIG_FILE")
            ORTHANC_USERNAME=$(jq -r '.orthanc_username // "orthanc"' "$CONFIG_FILE")
        else
            # Fallback: use grep/sed if jq not available
            ORTHANC_DOMAIN=$(grep -o '"orthanc_domain":"[^"]*"' "$CONFIG_FILE" | cut -d'"' -f4)
            API_DOMAIN=$(grep -o '"api_domain":"[^"]*"' "$CONFIG_FILE" | cut -d'"' -f4)
            ORTHANC_PASSWORD=$(grep -o '"orthanc_password":"[^"]*"' "$CONFIG_FILE" | cut -d'"' -f4)
            WEBHOOK_SECRET=$(grep -o '"webhook_secret":"[^"]*"' "$CONFIG_FILE" | cut -d'"' -f4)
            ORTHANC_USERNAME=$(grep -o '"orthanc_username":"[^"]*"' "$CONFIG_FILE" | cut -d'"' -f4 || echo "orthanc")
        fi
    fi
}

# Save configuration
save_config() {
    cat > "$CONFIG_FILE" <<EOF
{
  "orthanc_domain": "$ORTHANC_DOMAIN",
  "api_domain": "$API_DOMAIN",
  "orthanc_username": "$ORTHANC_USERNAME",
  "orthanc_password": "$ORTHANC_PASSWORD",
  "webhook_secret": "$WEBHOOK_SECRET",
  "deployed_at": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
}
EOF
}

# Check prerequisites
check_prerequisites() {
    print_header "Checking Prerequisites"
    
    local missing=0
    
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed"
        echo "   Install: https://docs.docker.com/get-docker/"
        missing=1
    else
        print_success "Docker is installed"
    fi
    
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        print_error "docker-compose is not installed"
        echo "   Install: https://docs.docker.com/compose/install/"
        missing=1
    else
        print_success "docker-compose is installed"
    fi
    
    if ! command -v curl &> /dev/null; then
        print_error "curl is not installed"
        missing=1
    else
        print_success "curl is installed"
    fi
    
    if ! command -v jq &> /dev/null; then
        print_warning "jq is not installed (optional, for JSON parsing)"
    else
        print_success "jq is installed"
    fi
    
    if [ $missing -eq 1 ]; then
        print_error "Please install missing prerequisites"
        exit 1
    fi
    
    print_success "All prerequisites met!"
}

# Get configuration from user
get_configuration() {
    print_header "Configuration"
    
    # Load existing config if available
    load_config
    
    if [ -f "$CONFIG_FILE" ]; then
        print_info "Found existing configuration"
        read -p "Use existing configuration? (y/n): " USE_EXISTING
        if [ "$USE_EXISTING" == "y" ]; then
            print_info "Using existing configuration"
            return
        fi
    fi
    
    echo ""
    print_info "Please provide the following information:"
    echo ""
    
    read -p "Enter Orthanc domain (e.g., orthanc.yourdomain.com): " ORTHANC_DOMAIN
    read -p "Enter API domain (e.g., your-app.vercel.app): " API_DOMAIN
    read -p "Enter Orthanc username (default: orthanc): " ORTHANC_USERNAME
    ORTHANC_USERNAME=${ORTHANC_USERNAME:-orthanc}
    
    read -sp "Enter Orthanc password (or press Enter for random): " ORTHANC_PASSWORD
    echo ""
    if [ -z "$ORTHANC_PASSWORD" ]; then
        ORTHANC_PASSWORD=$(openssl rand -base64 32 2>/dev/null || head -c 32 /dev/urandom | base64)
        print_info "Generated password: $ORTHANC_PASSWORD"
    fi
    
    read -sp "Enter webhook secret (or press Enter for random): " WEBHOOK_SECRET
    echo ""
    if [ -z "$WEBHOOK_SECRET" ]; then
        WEBHOOK_SECRET=$(openssl rand -base64 32 2>/dev/null || head -c 32 /dev/urandom | base64)
        print_info "Generated webhook secret: $WEBHOOK_SECRET"
    fi
    
    # Save configuration
    save_config
    print_success "Configuration saved to $CONFIG_FILE"
}

# Deploy Orthanc
deploy_orthanc() {
    print_header "Deploying Orthanc Server"
    
    # Create directories
    print_info "Creating directories..."
    mkdir -p docker/orthanc/data
    mkdir -p docker/orthanc/logs
    
    # Create production docker-compose
    print_info "Creating production configuration..."
    cat > docker-compose.orthanc.prod.yml <<EOF
version: '3.8'

services:
  orthanc:
    build:
      context: ./docker/orthanc
      dockerfile: Dockerfile
    container_name: nexrel-orthanc-prod
    ports:
      - "4242:4242"
      - "8042:8042"
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
    
    # Build and start
    print_info "Building Orthanc container..."
    if docker-compose -f docker-compose.orthanc.prod.yml build 2>&1 | grep -q "error\|Error\|ERROR"; then
        print_error "Build failed. Trying docker compose instead..."
        docker compose -f docker-compose.orthanc.prod.yml build
    else
        docker-compose -f docker-compose.orthanc.prod.yml build
    fi
    
    print_info "Starting Orthanc container..."
    if command -v docker-compose &> /dev/null; then
        docker-compose -f docker-compose.orthanc.prod.yml up -d
    else
        docker compose -f docker-compose.orthanc.prod.yml up -d
    fi
    
    # Wait for Orthanc to start
    print_info "Waiting for Orthanc to start..."
    local max_attempts=30
    local attempt=0
    while [ $attempt -lt $max_attempts ]; do
        if curl -sf -u "$ORTHANC_USERNAME:$ORTHANC_PASSWORD" http://localhost:8042/system > /dev/null 2>&1; then
            print_success "Orthanc is running!"
            return 0
        fi
        attempt=$((attempt + 1))
        sleep 2
    done
    
    print_error "Orthanc failed to start after $max_attempts attempts"
    print_info "Check logs: docker logs nexrel-orthanc-prod"
    return 1
}

# Create environment file
create_env_file() {
    print_header "Creating Environment Files"
    
    # Production env file
    cat > .env.orthanc.production <<EOF
# Production Orthanc Configuration
# Generated: $(date)

ORTHANC_BASE_URL=https://$ORTHANC_DOMAIN
ORTHANC_USERNAME=$ORTHANC_USERNAME
ORTHANC_PASSWORD=$ORTHANC_PASSWORD
DICOM_WEBHOOK_SECRET=$WEBHOOK_SECRET
DICOM_AE_TITLE=NEXREL-CRM
ORTHANC_HOST=$ORTHANC_DOMAIN
ORTHANC_PORT=4242

# API Webhook URL
DICOM_WEBHOOK_URL=https://$API_DOMAIN/api/dental/dicom/webhook
EOF
    
    print_success "Created .env.orthanc.production"
    
    # Create Nginx config
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
    
    print_success "Created nginx-orthanc.conf"
}

# Create webhook script
create_webhook_script() {
    print_header "Creating Webhook Configuration"
    
    local webhook_url="https://$API_DOMAIN/api/dental/dicom/webhook"
    
    # Create Lua script
    cat > /tmp/orthanc-webhook.lua <<EOF
function OnStoredInstance(dicom, instanceId)
   local url = '$webhook_url'
   local secret = '$WEBHOOK_SECRET'
   
   local headers = {
      ['Content-Type'] = 'application/json',
      ['Authorization'] = 'Bearer ' .. secret
   }
   
   -- Get user ID from Orthanc metadata or use default
   -- In production, store user ID in Orthanc metadata
   local userId = 'default-user-id'  -- TODO: Get from Orthanc metadata
   
   local body = {
      event = 'NewInstance',
      resourceId = instanceId,
      userId = userId
   }
   
   local http = require('socket.http')
   local ltn12 = require('ltn12')
   local json = require('json')
   
   local response_body = {}
   local res, code, response_headers = http.request{
      url = url,
      method = 'POST',
      headers = headers,
      source = ltn12.source.string(json.encode(body)),
      sink = ltn12.sink.table(response_body)
   }
   
   if code ~= 200 then
      print('Webhook failed: ' .. code)
   else
      print('Webhook succeeded for instance: ' .. instanceId)
   end
end
EOF
    
    print_success "Created webhook script: /tmp/orthanc-webhook.lua"
    print_info "To configure webhook:"
    echo "   1. Access Orthanc: http://localhost:8042"
    echo "   2. Go to Configuration → Lua Scripts"
    echo "   3. Copy script from /tmp/orthanc-webhook.lua"
}

# Test integration
test_integration() {
    print_header "Testing Integration"
    
    local api_url="https://$API_DOMAIN"
    local orthanc_url="http://localhost:8042"
    local tests_passed=0
    local tests_total=0
    
    # Test 1: Health Check
    print_info "Test 1: Health Check Endpoint"
    tests_total=$((tests_total + 1))
    if curl -sf "$api_url/api/dental/dicom/health" > /dev/null 2>&1; then
        print_success "Health check endpoint is accessible"
        tests_passed=$((tests_passed + 1))
    else
        print_warning "Health check endpoint not accessible (may need deployment)"
        print_info "   This is expected if API is not yet deployed"
    fi
    
    # Test 2: Orthanc Connection
    print_info "Test 2: Orthanc Connection"
    tests_total=$((tests_total + 1))
    if curl -sf -u "$ORTHANC_USERNAME:$ORTHANC_PASSWORD" "$orthanc_url/system" > /dev/null 2>&1; then
        print_success "Orthanc is accessible"
        local version=$(curl -sf -u "$ORTHANC_USERNAME:$ORTHANC_PASSWORD" "$orthanc_url/system" | grep -o '"Version":"[^"]*"' | cut -d'"' -f4 || echo "unknown")
        print_info "   Version: $version"
        tests_passed=$((tests_passed + 1))
    else
        print_error "Cannot connect to Orthanc"
    fi
    
    # Test 3: Docker Container
    print_info "Test 3: Docker Container Status"
    tests_total=$((tests_total + 1))
    if docker ps | grep -q "nexrel-orthanc-prod"; then
        print_success "Orthanc container is running"
        tests_passed=$((tests_passed + 1))
    else
        print_error "Orthanc container is not running"
    fi
    
    # Summary
    echo ""
    print_header "Test Summary"
    echo "Tests passed: $tests_passed/$tests_total"
    
    if [ $tests_passed -eq $tests_total ]; then
        print_success "All tests passed!"
    elif [ $tests_passed -gt 0 ]; then
        print_warning "Some tests passed. Check warnings above."
    else
        print_error "Tests failed. Check configuration."
    fi
}

# Print summary
print_summary() {
    print_header "Deployment Summary"
    
    echo "📋 Configuration:"
    echo "   Orthanc Domain: $ORTHANC_DOMAIN"
    echo "   API Domain: $API_DOMAIN"
    echo "   Orthanc Username: $ORTHANC_USERNAME"
    echo "   Orthanc Password: $ORTHANC_PASSWORD"
    echo "   Webhook Secret: $WEBHOOK_SECRET"
    echo ""
    
    echo "📁 Files Created:"
    echo "   - .env.orthanc.production (environment variables)"
    echo "   - .deployment-config.json (deployment config)"
    echo "   - docker-compose.orthanc.prod.yml (Docker Compose)"
    echo "   - nginx-orthanc.conf (Nginx configuration)"
    echo "   - /tmp/orthanc-webhook.lua (webhook script)"
    echo ""
    
    echo "🔗 URLs:"
    echo "   Orthanc Web Interface: http://localhost:8042"
    echo "   Orthanc Production: https://$ORTHANC_DOMAIN"
    echo "   API Health Check: https://$API_DOMAIN/api/dental/dicom/health"
    echo ""
    
    echo "📝 Next Steps:"
    echo ""
    echo "1. Set up Nginx reverse proxy:"
    echo "   sudo cp nginx-orthanc.conf /etc/nginx/sites-available/orthanc"
    echo "   sudo ln -s /etc/nginx/sites-available/orthanc /etc/nginx/sites-enabled/"
    echo "   sudo nginx -t && sudo systemctl reload nginx"
    echo ""
    echo "2. Set up SSL certificate:"
    echo "   sudo certbot --nginx -d $ORTHANC_DOMAIN"
    echo ""
    echo "3. Configure webhook in Orthanc:"
    echo "   - Access: http://localhost:8042"
    echo "   - Login: $ORTHANC_USERNAME / $ORTHANC_PASSWORD"
    echo "   - Go to Configuration → Lua Scripts"
    echo "   - Copy script from /tmp/orthanc-webhook.lua"
    echo ""
    echo "4. Add environment variables to Vercel:"
    echo "   - Go to Vercel Dashboard → Your Project → Settings → Environment Variables"
    echo "   - Copy values from .env.orthanc.production"
    echo "   - Add all variables"
    echo "   - Redeploy"
    echo ""
    echo "5. Configure X-ray machines:"
    echo "   - Server: $ORTHANC_DOMAIN (or IP)"
    echo "   - Port: 4242"
    echo "   - AE Title: NEXREL-CRM"
    echo ""
    
    print_success "Deployment script completed!"
}

# Main execution
main() {
    clear
    echo ""
    print_header "🚀 Nexrel CRM DICOM Deployment"
    echo ""
    
    # Check prerequisites
    check_prerequisites
    
    # Get configuration
    get_configuration
    
    # Deploy Orthanc
    if deploy_orthanc; then
        print_success "Orthanc deployed successfully"
    else
        print_error "Orthanc deployment failed"
        exit 1
    fi
    
    # Create environment files
    create_env_file
    
    # Create webhook script
    create_webhook_script
    
    # Test integration
    test_integration
    
    # Print summary
    print_summary
}

# Run main function
main
