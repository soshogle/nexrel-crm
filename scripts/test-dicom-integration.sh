#!/bin/bash

# Test DICOM Integration Script
# Tests all components of the DICOM integration

set -e

echo "🧪 Testing DICOM Integration"
echo "============================"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get configuration
read -p "Enter API URL (e.g., http://localhost:3000 or https://your-app.vercel.app): " API_URL
read -p "Enter Orthanc URL (e.g., http://localhost:8042): " ORTHANC_URL
read -p "Enter Orthanc username (default: orthanc): " ORTHANC_USER
ORTHANC_USER=${ORTHANC_USER:-orthanc}
read -sp "Enter Orthanc password: " ORTHANC_PASS
echo ""

# Test 1: Health Check
echo ""
echo "1️⃣  Testing Health Check Endpoint..."
HEALTH_RESPONSE=$(curl -s "$API_URL/api/dental/dicom/health")
if echo "$HEALTH_RESPONSE" | grep -q "healthy"; then
    echo -e "${GREEN}✅ Health check passed${NC}"
    echo "   Response: $HEALTH_RESPONSE"
else
    echo -e "${RED}❌ Health check failed${NC}"
    echo "   Response: $HEALTH_RESPONSE"
fi

# Test 2: Orthanc Connection
echo ""
echo "2️⃣  Testing Orthanc Connection..."
ORTHANC_RESPONSE=$(curl -s -u "$ORTHANC_USER:$ORTHANC_PASS" "$ORTHANC_URL/system")
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Orthanc is accessible${NC}"
    ORTHANC_VERSION=$(echo "$ORTHANC_RESPONSE" | grep -o '"Version":"[^"]*"' | cut -d'"' -f4)
    echo "   Version: $ORTHANC_VERSION"
else
    echo -e "${RED}❌ Cannot connect to Orthanc${NC}"
fi

# Test 3: Webhook Endpoint (without actual webhook)
echo ""
echo "3️⃣  Testing Webhook Endpoint..."
read -sp "Enter webhook secret (or press Enter to skip): " WEBHOOK_SECRET
echo ""

if [ -n "$WEBHOOK_SECRET" ]; then
    WEBHOOK_TEST=$(curl -s -X POST "$API_URL/api/dental/dicom/webhook" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $WEBHOOK_SECRET" \
        -d '{"event":"NewInstance","resourceId":"test-instance","userId":"test-user"}')
    
    if echo "$WEBHOOK_TEST" | grep -q "success\|processed"; then
        echo -e "${GREEN}✅ Webhook endpoint is working${NC}"
    else
        echo -e "${YELLOW}⚠️  Webhook endpoint responded (may need actual instance)${NC}"
        echo "   Response: $WEBHOOK_TEST"
    fi
else
    echo -e "${YELLOW}⚠️  Skipping webhook test (no secret provided)${NC}"
fi

# Test 4: Query Endpoint
echo ""
echo "4️⃣  Testing Query Endpoint..."
read -p "Enter test user ID (or press Enter to skip): " USER_ID

if [ -n "$USER_ID" ]; then
    # This would require authentication - simplified test
    echo -e "${YELLOW}⚠️  Query test requires authentication${NC}"
    echo "   Test manually: POST $API_URL/api/dental/dicom/query"
else
    echo -e "${YELLOW}⚠️  Skipping query test${NC}"
fi

# Test 5: Check for test DICOM file
echo ""
echo "5️⃣  Checking for test DICOM files..."
if [ -f "tests/fixtures/sample.dcm" ] || [ -f "tests/fixtures/dicom-files/sample.dcm" ]; then
    echo -e "${GREEN}✅ Test DICOM file found${NC}"
    echo "   You can upload this file to test the full integration"
else
    echo -e "${YELLOW}⚠️  No test DICOM file found${NC}"
    echo "   Create one or download from: https://www.dclunie.com/images/"
fi

# Summary
echo ""
echo "📊 Test Summary"
echo "=============="
echo "   Health Check: $(echo "$HEALTH_RESPONSE" | grep -q "healthy" && echo -e "${GREEN}✅${NC}" || echo -e "${RED}❌${NC}")"
echo "   Orthanc Connection: $([ $? -eq 0 ] && echo -e "${GREEN}✅${NC}" || echo -e "${RED}❌${NC}")"
echo ""
echo "💡 Next Steps:"
echo "   1. Upload a test DICOM file via the UI"
echo "   2. Send a test DICOM from X-ray machine to Orthanc"
echo "   3. Verify webhook is triggered"
echo "   4. Check patient matching"
echo ""
