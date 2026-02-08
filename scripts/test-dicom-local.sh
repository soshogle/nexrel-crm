#!/bin/bash

# Test DICOM Upload Locally
# Tests the complete DICOM workflow: Upload → Orthanc → Webhook → Processing

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo ""
echo -e "${BLUE}🧪 Testing DICOM Upload Locally${NC}"
echo ""

# Check if Orthanc is running
echo -e "${GREEN}Checking Orthanc...${NC}"
if ! curl -sf http://localhost:8042/system > /dev/null 2>&1; then
    echo -e "${RED}❌ Orthanc is not running!${NC}"
    echo "   Start it with: ./scripts/start-local-orthanc.sh"
    exit 1
fi
echo -e "${GREEN}✅ Orthanc is running${NC}"

# Check if Next.js is running
echo -e "${GREEN}Checking Next.js app...${NC}"
if ! curl -sf http://localhost:3000 > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Next.js app not running on port 3000${NC}"
    echo "   Start it with: npm run dev"
    read -p "Continue anyway? (y/n): " CONTINUE
    if [ "$CONTINUE" != "y" ]; then
        exit 1
    fi
fi

# Check for DICOM files
echo -e "${GREEN}Checking for DICOM files...${NC}"
if [ ! -d "test-data/dicom-samples" ] || [ -z "$(ls -A test-data/dicom-samples/*.dcm 2>/dev/null)" ]; then
    echo -e "${YELLOW}⚠️  No DICOM files found. Downloading samples...${NC}"
    ./scripts/download-sample-dicom.sh
fi

DICOM_FILE=$(find test-data/dicom-samples -name "*.dcm" | head -1)

if [ -z "$DICOM_FILE" ]; then
    echo -e "${RED}❌ No DICOM files found!${NC}"
    echo "   Download samples: ./scripts/download-sample-dicom.sh"
    exit 1
fi

echo -e "${GREEN}✅ Found DICOM file: $DICOM_FILE${NC}"

# Upload to Orthanc
echo ""
echo -e "${BLUE}📤 Uploading to Orthanc...${NC}"
RESPONSE=$(curl -s -u orthanc:orthanc \
    -X POST http://localhost:8042/instances \
    -F file=@"$DICOM_FILE")

INSTANCE_ID=$(echo "$RESPONSE" | grep -o '"ID":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$INSTANCE_ID" ]; then
    echo -e "${RED}❌ Upload failed!${NC}"
    echo "Response: $RESPONSE"
    exit 1
fi

echo -e "${GREEN}✅ Uploaded successfully!${NC}"
echo "   Instance ID: $INSTANCE_ID"

# Test webhook manually
echo ""
echo -e "${BLUE}🔔 Testing webhook...${NC}"
WEBHOOK_SECRET=${DICOM_WEBHOOK_SECRET:-local-test-secret-change-in-production}
USER_ID=${TEST_USER_ID:-test-user-id}

WEBHOOK_RESPONSE=$(curl -s -X POST http://localhost:3000/api/dental/dicom/webhook \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $WEBHOOK_SECRET" \
    -d "{
        \"event\": \"NewInstance\",
        \"resourceId\": \"$INSTANCE_ID\",
        \"userId\": \"$USER_ID\"
    }")

if echo "$WEBHOOK_RESPONSE" | grep -q "success\|processed"; then
    echo -e "${GREEN}✅ Webhook triggered successfully!${NC}"
else
    echo -e "${YELLOW}⚠️  Webhook response: $WEBHOOK_RESPONSE${NC}"
fi

echo ""
echo -e "${GREEN}✅ Test complete!${NC}"
echo ""
echo "Next steps:"
echo "  1. Check Orthanc web UI: http://localhost:8042"
echo "  2. Check Next.js app for processed DICOM"
echo "  3. Verify patient matching (if Patient ID matches)"
