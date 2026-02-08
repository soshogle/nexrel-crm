#!/bin/bash

# Test DICOM Upload with Fresh Instance
# Deletes existing instance and uploads fresh

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo ""
echo -e "${BLUE}🧪 Testing Fresh DICOM Upload${NC}"
echo ""

# Check Orthanc
if ! curl -sf -u orthanc:orthanc http://localhost:8042/system > /dev/null 2>&1; then
    echo -e "${RED}❌ Orthanc is not running!${NC}"
    echo "Start with: ./scripts/start-local-orthanc.sh"
    exit 1
fi

# Get existing instances
echo -e "${GREEN}Step 1: Checking existing instances...${NC}"
INSTANCES=$(curl -s -u orthanc:orthanc http://localhost:8042/instances)
INSTANCE_COUNT=$(echo "$INSTANCES" | python3 -c "import sys, json; print(len(json.load(sys.stdin)))" 2>/dev/null || echo "0")

if [ "$INSTANCE_COUNT" -gt 0 ]; then
    echo -e "${YELLOW}Found $INSTANCE_COUNT existing instance(s)${NC}"
    echo "$INSTANCES" | python3 -c "import sys, json; [print(f'  - {id}') for id in json.load(sys.stdin)]"
    
    read -p "Delete existing instances? (y/n): " DELETE
    if [ "$DELETE" = "y" ]; then
        echo -e "${GREEN}Deleting existing instances...${NC}"
        echo "$INSTANCES" | python3 -c "
import sys, json
import urllib.request
import base64

instances = json.load(sys.stdin)
auth = base64.b64encode(b'orthanc:orthanc').decode('ascii')

for instance_id in instances:
    req = urllib.request.Request(f'http://localhost:8042/instances/{instance_id}', method='DELETE')
    req.add_header('Authorization', f'Basic {auth}')
    try:
        urllib.request.urlopen(req)
        print(f'  ✅ Deleted: {instance_id}')
    except Exception as e:
        print(f'  ❌ Failed to delete {instance_id}: {e}')
"
        echo -e "${GREEN}✅ Instances deleted${NC}"
    fi
else
    echo -e "${GREEN}✅ No existing instances${NC}"
fi

# Upload DICOM file
echo ""
echo -e "${GREEN}Step 2: Uploading DICOM file...${NC}"
DICOM_FILE="test-data/dicom-samples/rubo-medical-sample.dcm"

if [ ! -f "$DICOM_FILE" ]; then
    echo -e "${RED}❌ DICOM file not found: $DICOM_FILE${NC}"
    exit 1
fi

echo "Uploading: $(basename "$DICOM_FILE") ($(du -h "$DICOM_FILE" | cut -f1))"

RESPONSE=$(curl -s -u orthanc:orthanc -X POST http://localhost:8042/instances -F file=@"$DICOM_FILE")
INSTANCE_ID=$(echo "$RESPONSE" | python3 -c "import sys, json; data = json.load(sys.stdin); print(data.get('ID', ''))" 2>/dev/null || echo "")

if [ -z "$INSTANCE_ID" ]; then
    # Check if it's a duplicate
    sleep 1
    ALL_INSTANCES=$(curl -s -u orthanc:orthanc http://localhost:8042/instances)
    NEW_COUNT=$(echo "$ALL_INSTANCES" | python3 -c "import sys, json; print(len(json.load(sys.stdin)))" 2>/dev/null || echo "0")
    
    if [ "$NEW_COUNT" -gt "$INSTANCE_COUNT" ]; then
        INSTANCE_ID=$(echo "$ALL_INSTANCES" | python3 -c "import sys, json; data = json.load(sys.stdin); print(data[-1])" 2>/dev/null || echo "")
        echo -e "${GREEN}✅ Upload successful!${NC}"
        echo "   Instance ID: $INSTANCE_ID"
    else
        echo -e "${YELLOW}⚠️  Upload returned empty response (likely duplicate)${NC}"
        echo "   Orthanc may have rejected it as duplicate"
        echo "   Response: $RESPONSE"
        exit 1
    fi
else
    echo -e "${GREEN}✅ Upload successful!${NC}"
    echo "   Instance ID: $INSTANCE_ID"
fi

# Check webhook
echo ""
echo -e "${GREEN}Step 3: Checking webhook...${NC}"
if ! curl -sf http://localhost:3000 > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Next.js app is not running${NC}"
    echo "   Start it with: npm run dev"
    echo "   Webhook cannot be tested until Next.js is running"
else
    echo -e "${GREEN}✅ Next.js app is running${NC}"
    echo "   Webhook should have been triggered automatically"
    echo "   Check logs: docker logs nexrel-orthanc | grep webhook"
fi

echo ""
echo -e "${GREEN}✅ Test Complete!${NC}"
echo ""
echo "📋 Summary:"
echo "  - Instance ID: $INSTANCE_ID"
echo "  - View in Orthanc: http://localhost:8042/app/explorer.html#instances/$INSTANCE_ID"
echo ""
echo "🔍 Next Steps:"
echo "  1. Start Next.js: npm run dev"
echo "  2. Check webhook logs: docker logs nexrel-orthanc | grep webhook"
echo "  3. Check database for new X-ray records"
