#!/bin/bash

# Test uploading DICOM files to Orthanc

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

ORTHANC_URL="http://localhost:8042"
USERNAME="orthanc"
PASSWORD="orthanc"

echo ""
echo -e "${BLUE}🧪 Testing DICOM Upload to Orthanc${NC}"
echo ""

# Check if Orthanc is running
if ! curl -s -u "$USERNAME:$PASSWORD" "$ORTHANC_URL/system" > /dev/null 2>&1; then
    echo -e "${RED}❌ Orthanc is not running or not accessible at $ORTHANC_URL${NC}"
    echo ""
    echo "Please start Orthanc first:"
    echo "   docker-compose -f docker-compose.orthanc.yml up -d"
    exit 1
fi

echo -e "${GREEN}✅ Orthanc is running${NC}"
echo ""

# Test files
FILES=(
    "test-data/dicom-samples/0002.DCM"
    "test-data/dicom-samples/sample-valid.dcm"
)

for FILE in "${FILES[@]}"; do
    if [ ! -f "$FILE" ]; then
        echo -e "${YELLOW}⚠️  File not found: $FILE${NC}"
        continue
    fi
    
    echo -e "${BLUE}📤 Uploading: $FILE${NC}"
    
    RESPONSE=$(curl -s -w "\n%{http_code}" -u "$USERNAME:$PASSWORD" \
        -X POST "$ORTHANC_URL/instances" \
        -F "file=@$FILE")
    
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | sed '$d')
    
    if [ "$HTTP_CODE" = "200" ]; then
        echo -e "${GREEN}✅ Upload successful!${NC}"
        echo "   Response: $BODY"
        
        # Extract instance ID from response
        INSTANCE_ID=$(echo "$BODY" | grep -o '"ID":"[^"]*"' | head -1 | cut -d'"' -f4)
        if [ -n "$INSTANCE_ID" ]; then
            echo "   Instance ID: $INSTANCE_ID"
            echo "   View in Orthanc: $ORTHANC_URL/app/explorer.html#instances/$INSTANCE_ID"
        fi
    else
        echo -e "${RED}❌ Upload failed (HTTP $HTTP_CODE)${NC}"
        echo "   Response: $BODY"
    fi
    
    echo ""
done

echo -e "${BLUE}📋 Check Orthanc UI for uploaded instances:${NC}"
echo "   $ORTHANC_URL"
echo ""
echo -e "${BLUE}📋 Check webhook logs in your Next.js app${NC}"
echo "   The webhook should trigger automatically when files are uploaded"
echo ""
