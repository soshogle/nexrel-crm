#!/bin/bash

# Download Sample DICOM Files for Testing
# Downloads publicly available DICOM test files

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo ""
echo -e "${BLUE}📥 Downloading Sample DICOM Files${NC}"
echo ""

# Create directory
mkdir -p test-data/dicom-samples
cd test-data/dicom-samples

# Check if curl or wget is available
if command -v curl &> /dev/null; then
    DOWNLOAD_CMD="curl -L -o"
elif command -v wget &> /dev/null; then
    DOWNLOAD_CMD="wget -O"
else
    echo -e "${YELLOW}❌ Neither curl nor wget found. Please install one.${NC}"
    exit 1
fi

echo -e "${GREEN}Downloading sample DICOM files...${NC}"

# Download from OHIF Viewer repository (public DICOM files)
echo "Downloading from OHIF Viewer repository..."

# Sample CT scan
$DOWNLOAD_CMD sample-ct.dcm "https://raw.githubusercontent.com/OHIF/Viewers/master/public/dicom-files/CT/1.3.6.1.4.1.25403.345050719074.3824.20170125112931.1.dcm" 2>/dev/null || echo "Failed to download CT sample"

# Sample X-Ray
$DOWNLOAD_CMD sample-xray.dcm "https://raw.githubusercontent.com/OHIF/Viewers/master/public/dicom-files/CR/1.3.6.1.4.1.25403.345050719074.3824.20170125112931.2.dcm" 2>/dev/null || echo "Failed to download X-Ray sample"

# Alternative: Download from DICOM Library
echo "Downloading from DICOM Library..."

# Try to download a small sample file
$DOWNLOAD_CMD sample-small.dcm "https://www.dclunie.com/images/JPEGLosslessSample.dcm" 2>/dev/null || echo "Failed to download from DICOM Library"

echo ""
echo -e "${GREEN}✅ Download complete!${NC}"
echo ""
echo "Files downloaded to: test-data/dicom-samples/"
echo ""
echo "If downloads failed, you can manually download DICOM files from:"
echo "  - https://www.dclunie.com/images/"
echo "  - https://www.osirix-viewer.com/resources/dicom-image-library/"
echo "  - https://github.com/OHIF/Viewers/tree/master/public/dicom-files"
echo ""

# List downloaded files
if [ -f "sample-ct.dcm" ] || [ -f "sample-xray.dcm" ] || [ -f "sample-small.dcm" ]; then
    echo "Downloaded files:"
    ls -lh *.dcm 2>/dev/null || true
else
    echo -e "${YELLOW}⚠️  No files were downloaded. Please download manually.${NC}"
fi

echo ""
