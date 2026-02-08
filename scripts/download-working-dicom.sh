#!/bin/bash

# Download a Working DICOM File for Testing
# Downloads a real, complete DICOM file that Orthanc will accept

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo ""
echo -e "${BLUE}📥 Downloading Working DICOM File${NC}"
echo ""

mkdir -p test-data/dicom-samples
cd test-data/dicom-samples

if command -v curl &> /dev/null; then
    DOWNLOAD_CMD="curl -L -f --connect-timeout 20 --max-time 120 -o"
elif command -v wget &> /dev/null; then
    DOWNLOAD_CMD="wget --timeout=20 -O"
else
    echo -e "${RED}❌ Neither curl nor wget found.${NC}"
    exit 1
fi

DOWNLOADED=0

# Try downloading from multiple sources
echo "Downloading real DICOM file..."

# Source 1: Try a known working DICOM file from a public repository
echo "1. Trying public DICOM repository..."
if $DOWNLOAD_CMD sample-working.dcm "https://raw.githubusercontent.com/OHIF/Viewers/master/public/dicom-files/CT/1.3.6.1.4.1.25403.345050719074.3824.20170125112931.1.dcm" 2>/dev/null && [ -f sample-working.dcm ] && [ -s sample-working.dcm ] && [ $(stat -f%z sample-working.dcm 2>/dev/null || stat -c%s sample-working.dcm 2>/dev/null) -gt 1000 ]; then
    SIZE=$(du -h sample-working.dcm | cut -f1)
    echo -e "${GREEN}   ✅ Downloaded: sample-working.dcm ($SIZE)${NC}"
    DOWNLOADED=$((DOWNLOADED + 1))
else
    rm -f sample-working.dcm 2>/dev/null
    echo -e "${YELLOW}   ⚠️  Failed to download from GitHub${NC}"
fi

# Source 2: Try DICOM Library
if [ $DOWNLOADED -eq 0 ]; then
    echo "2. Trying DICOM Library..."
    if $DOWNLOAD_CMD sample-library.dcm "https://www.dclunie.com/images/JPEGLosslessSample.dcm" 2>/dev/null && [ -f sample-library.dcm ] && [ -s sample-library.dcm ] && [ $(stat -f%z sample-library.dcm 2>/dev/null || stat -c%s sample-library.dcm 2>/dev/null) -gt 1000 ]; then
        SIZE=$(du -h sample-library.dcm | cut -f1)
        echo -e "${GREEN}   ✅ Downloaded: sample-library.dcm ($SIZE)${NC}"
        DOWNLOADED=$((DOWNLOADED + 1))
    else
        rm -f sample-library.dcm 2>/dev/null
        echo -e "${YELLOW}   ⚠️  Failed to download from DICOM Library${NC}"
    fi
fi

echo ""
if [ $DOWNLOADED -gt 0 ]; then
    echo -e "${GREEN}✅ Successfully downloaded working DICOM file!${NC}"
    echo ""
    echo "Files ready:"
    ls -lh *.dcm 2>/dev/null | awk '{printf "  - %-30s %6s\n", $9, $5}'
    echo ""
    echo -e "${BLUE}📋 Next Steps:${NC}"
    echo ""
    echo "  1. Try uploading again in Orthanc UI"
    echo "  2. Or use curl: curl -u orthanc:orthanc -X POST http://localhost:8042/instances -F file=@test-data/dicom-samples/sample-working.dcm"
    echo ""
else
    echo -e "${RED}❌ Could not download a working DICOM file automatically.${NC}"
    echo ""
    echo -e "${YELLOW}Manual Options:${NC}"
    echo ""
    echo "Option 1: Download manually"
    echo "  Visit: https://www.dclunie.com/images/"
    echo "  Download any .dcm file (preferably > 1KB)"
    echo "  Save to: test-data/dicom-samples/"
    echo ""
    echo "Option 2: Use your own DICOM files"
    echo "  Copy any real DICOM files (.dcm) to: test-data/dicom-samples/"
    echo ""
    echo "Option 3: Skip file upload test for now"
    echo "  The webhook can still be tested manually with a mock instance ID"
    echo ""
fi

echo ""
