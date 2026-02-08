#!/bin/bash

# Download Real DICOM Files - Final Version
# Downloads from reliable public sources

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo ""
echo -e "${BLUE}📥 Downloading Real DICOM Files${NC}"
echo ""

mkdir -p test-data/dicom-samples
cd test-data/dicom-samples

if command -v curl &> /dev/null; then
    DOWNLOAD_CMD="curl -L -f --connect-timeout 15 --max-time 60 -o"
elif command -v wget &> /dev/null; then
    DOWNLOAD_CMD="wget --timeout=15 -O"
else
    echo -e "${RED}❌ Neither curl nor wget found.${NC}"
    exit 1
fi

DOWNLOADED=0

# Try downloading from HorliX (reliable source)
echo "1. Downloading from HorliX DICOM Library..."
echo "   (This may take a moment for larger files)"

# Try Sample 1 - CT Scan (smaller file)
if $DOWNLOAD_CMD sample-ct-horlix.dcm "https://phazor.info/HorliX/wp-content/uploads/2020/04/Sample1.dcm" 2>/dev/null && [ -f sample-ct-horlix.dcm ] && [ -s sample-ct-horlix.dcm ]; then
    SIZE=$(du -h sample-ct-horlix.dcm | cut -f1)
    echo -e "${GREEN}   ✅ Downloaded: sample-ct-horlix.dcm ($SIZE)${NC}"
    DOWNLOADED=$((DOWNLOADED + 1))
else
    rm -f sample-ct-horlix.dcm 2>/dev/null
    echo -e "${YELLOW}   ⚠️  Failed to download CT from HorliX${NC}"
fi

# Try Sample 3 - Computed Radiography (X-Ray)
if $DOWNLOAD_CMD sample-cr-horlix.dcm "https://phazor.info/HorliX/wp-content/uploads/2020/04/Sample3.dcm" 2>/dev/null && [ -f sample-cr-horlix.dcm ] && [ -s sample-cr-horlix.dcm ]; then
    SIZE=$(du -h sample-cr-horlix.dcm | cut -f1)
    echo -e "${GREEN}   ✅ Downloaded: sample-cr-horlix.dcm ($SIZE)${NC}"
    DOWNLOADED=$((DOWNLOADED + 1))
else
    rm -f sample-cr-horlix.dcm 2>/dev/null
    echo -e "${YELLOW}   ⚠️  Failed to download CR from HorliX${NC}"
fi

# Try from Figshare (reliable academic source)
echo "2. Downloading from Figshare..."
if $DOWNLOAD_CMD sample-figshare.dcm "https://figshare.com/ndownloader/files/18130668" 2>/dev/null && [ -f sample-figshare.dcm ] && [ -s sample-figshare.dcm ]; then
    SIZE=$(du -h sample-figshare.dcm | cut -f1)
    echo -e "${GREEN}   ✅ Downloaded: sample-figshare.dcm ($SIZE)${NC}"
    DOWNLOADED=$((DOWNLOADED + 1))
else
    rm -f sample-figshare.dcm 2>/dev/null
    echo -e "${YELLOW}   ⚠️  Failed to download from Figshare${NC}"
fi

# Verify existing files
echo "3. Checking existing files..."
EXISTING=0
for file in *.dcm; do
    if [ -f "$file" ] && [ -s "$file" ]; then
        SIZE=$(du -h "$file" | cut -f1)
        echo -e "${GREEN}   ✅ Found: $file ($SIZE)${NC}"
        EXISTING=$((EXISTING + 1))
    fi
done

TOTAL=$((DOWNLOADED + EXISTING))

echo ""
if [ $TOTAL -gt 0 ]; then
    echo -e "${GREEN}✅ Total DICOM files available: $TOTAL${NC}"
    echo ""
    echo "Files ready for testing:"
    ls -lh *.dcm 2>/dev/null | awk '{printf "  - %-30s %6s\n", $9, $5}'
    echo ""
    echo -e "${BLUE}📋 Next Steps:${NC}"
    echo ""
    echo "  1. Start Orthanc:     ./scripts/start-local-orthanc.sh"
    echo "  2. Start Next.js:      npm run dev"
    echo "  3. Test upload:        ./scripts/test-real-dicom.sh"
    echo ""
    echo "Or upload manually:"
    echo "  curl -u orthanc:orthanc -X POST http://localhost:8042/instances \\"
    echo "    -F file=@test-data/dicom-samples/sample-minimal.dcm"
    echo ""
else
    echo -e "${YELLOW}⚠️  No DICOM files available.${NC}"
    echo ""
    echo "Manual options:"
    echo "  1. Visit https://phazor.info/HorliX/?page_id=184"
    echo "  2. Visit https://3dicomviewer.com/dicom-library/"
    echo "  3. Use your own DICOM files (.dcm format)"
    echo ""
fi

echo ""
