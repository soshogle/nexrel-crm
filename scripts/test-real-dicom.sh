#!/bin/bash

# Test Real DICOM Files Upload
# Comprehensive test script for real DICOM files

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo ""
echo -e "${BLUE}🧪 Testing Real DICOM Files${NC}"
echo ""

# Check if DICOM files exist
echo -e "${GREEN}Step 1: Checking for DICOM files...${NC}"
if [ ! -d "test-data/dicom-samples" ] || [ -z "$(ls -A test-data/dicom-samples/*.dcm 2>/dev/null)" ]; then
    echo -e "${YELLOW}⚠️  No DICOM files found. Downloading...${NC}"
    ./scripts/download-real-dicom.sh
fi

DICOM_FILES=($(find test-data/dicom-samples -name "*.dcm" -type f))

if [ ${#DICOM_FILES[@]} -eq 0 ]; then
    echo -e "${RED}❌ No DICOM files found!${NC}"
    echo "   Run: ./scripts/download-real-dicom.sh"
    exit 1
fi

echo -e "${GREEN}✅ Found ${#DICOM_FILES[@]} DICOM file(s)${NC}"
for file in "${DICOM_FILES[@]}"; do
    echo "   - $(basename "$file") ($(du -h "$file" | cut -f1))"
done

# Check Orthanc
echo ""
echo -e "${GREEN}Step 2: Checking Orthanc...${NC}"
if ! curl -sf -u orthanc:orthanc http://localhost:8042/system > /dev/null 2>&1; then
    echo -e "${RED}❌ Orthanc is not running!${NC}"
    echo ""
    echo "Start Orthanc with:"
    echo "  ./scripts/start-local-orthanc.sh"
    echo ""
    echo "Or manually:"
    echo "  docker-compose -f docker-compose.orthanc.yml up -d"
    exit 1
fi
echo -e "${GREEN}✅ Orthanc is running${NC}"

# Check Next.js
echo ""
echo -e "${GREEN}Step 3: Checking Next.js app...${NC}"
if ! curl -sf http://localhost:3000 > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Next.js app not running on port 3000${NC}"
    echo "   Start it with: npm run dev"
    echo ""
    read -p "Continue with upload test anyway? (y/n): " CONTINUE
    if [ "$CONTINUE" != "y" ]; then
        exit 1
    fi
else
    echo -e "${GREEN}✅ Next.js app is running${NC}"
fi

# Upload first DICOM file
echo ""
echo -e "${BLUE}Step 4: Uploading DICOM file to Orthanc...${NC}"
DICOM_FILE="${DICOM_FILES[0]}"
echo "Uploading: $(basename "$DICOM_FILE")"

RESPONSE=$(curl -s -u orthanc:orthanc \
    -X POST http://localhost:8042/instances \
    -F file=@"$DICOM_FILE")

# Extract instance ID
INSTANCE_ID=$(echo "$RESPONSE" | grep -o '"ID":"[^"]*"' | head -1 | cut -d'"' -f4 || echo "")

if [ -z "$INSTANCE_ID" ]; then
    echo -e "${RED}❌ Upload failed!${NC}"
    echo "Response: $RESPONSE"
    exit 1
fi

echo -e "${GREEN}✅ Uploaded successfully!${NC}"
echo "   Instance ID: $INSTANCE_ID"
echo "   View in Orthanc: http://localhost:8042/app/explorer.html#instances/$INSTANCE_ID"

# Test webhook
echo ""
echo -e "${BLUE}Step 5: Testing webhook...${NC}"
WEBHOOK_SECRET=${DICOM_WEBHOOK_SECRET:-local-test-secret-change-in-production}

WEBHOOK_RESPONSE=$(curl -s -X POST http://localhost:3000/api/dental/dicom/webhook \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $WEBHOOK_SECRET" \
    -d "{
        \"event\": \"NewInstance\",
        \"resourceId\": \"$INSTANCE_ID\",
        \"userId\": \"test-user-id\"
    }" 2>&1)

if echo "$WEBHOOK_RESPONSE" | grep -qi "success\|processed\|ok"; then
    echo -e "${GREEN}✅ Webhook processed successfully!${NC}"
elif echo "$WEBHOOK_RESPONSE" | grep -qi "error\|fail"; then
    echo -e "${YELLOW}⚠️  Webhook response: $WEBHOOK_RESPONSE${NC}"
else
    echo -e "${GREEN}✅ Webhook triggered (response: $WEBHOOK_RESPONSE)${NC}"
fi

# Display DICOM metadata
echo ""
echo -e "${BLUE}Step 6: DICOM File Information${NC}"
if command -v dcmdump &> /dev/null; then
    echo "DICOM Metadata:"
    dcmdump "$DICOM_FILE" 2>/dev/null | grep -E "(PatientID|PatientName|StudyDate|Modality|StudyDescription)" | head -5 || echo "   (Install dcmtk to view metadata: brew install dcmtk)"
else
    echo "Install dcmtk to view DICOM metadata:"
    echo "  macOS: brew install dcmtk"
    echo "  Linux: sudo apt-get install dcmtk"
fi

echo ""
echo -e "${GREEN}✅ Test Complete!${NC}"
echo ""
echo "📋 Summary:"
echo "  - DICOM file uploaded to Orthanc"
echo "  - Instance ID: $INSTANCE_ID"
echo "  - Webhook triggered"
echo ""
echo "🔍 Verify:"
echo "  1. Check Orthanc UI: http://localhost:8042"
echo "  2. Check Next.js app: http://localhost:3000/dashboard/dental/clinical"
echo "  3. Check database for new X-ray records"
echo ""
