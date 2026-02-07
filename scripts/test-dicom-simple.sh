#!/bin/bash

# Simple DICOM Test Script
# Tests DICOM system without real X-ray machines

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo ""
echo -e "${BLUE}🧪 DICOM Testing Without Real X-Ray Machines${NC}"
echo ""

echo -e "${YELLOW}Option 1: Upload via UI (Easiest)${NC}"
echo "1. Go to Dental Management page"
echo "2. Click 'Upload X-Ray'"
echo "3. Select test DICOM file"
echo "4. Upload and verify"
echo ""

echo -e "${YELLOW}Option 2: Upload to Orthanc${NC}"
echo "curl -X POST http://localhost:8042/instances \\"
echo "  -u orthanc:password \\"
echo "  -F file=@test-file.dcm"
echo ""

echo -e "${YELLOW}Option 3: Use DICOM Tools (Most Realistic)${NC}"
echo "# Install dcmtk: brew install dcmtk"
echo "# Send file: storescu -aec NEXREL-CRM localhost 4242 test-file.dcm"
echo ""

echo -e "${GREEN}📥 Get Test DICOM Files:${NC}"
echo "- https://www.dclunie.com/images/"
echo "- https://www.osirix-viewer.com/resources/dicom-image-library/"
echo ""

echo "See docs/TESTING_WITHOUT_REAL_XRAYS.md for details"
