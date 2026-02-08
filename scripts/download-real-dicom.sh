#!/bin/bash

# Download Real DICOM Files for Testing
# Downloads actual DICOM files from public repositories

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo ""
echo -e "${BLUE}📥 Downloading Real DICOM Files${NC}"
echo ""

# Create directory
mkdir -p test-data/dicom-samples
cd test-data/dicom-samples

# Check if curl or wget is available
if command -v curl &> /dev/null; then
    DOWNLOAD_CMD="curl -L -f -o"
elif command -v wget &> /dev/null; then
    DOWNLOAD_CMD="wget -O"
else
    echo -e "${RED}❌ Neither curl nor wget found. Please install one.${NC}"
    exit 1
fi

echo -e "${GREEN}Downloading real DICOM files from public repositories...${NC}"
echo ""

# Download from reliable sources
DOWNLOADED=0

# 1. Download from DICOM Library (DCLunie)
echo "1. Downloading from DICOM Library (dclunie.com)..."
if $DOWNLOAD_CMD sample-jpeg-lossless.dcm "https://www.dclunie.com/images/JPEGLosslessSample.dcm" 2>/dev/null; then
    echo -e "${GREEN}   ✅ Downloaded: sample-jpeg-lossless.dcm${NC}"
    DOWNLOADED=$((DOWNLOADED + 1))
else
    echo -e "${YELLOW}   ⚠️  Failed to download from DCLunie${NC}"
fi

# 2. Download from Osirix DICOM Library
echo "2. Downloading from Osirix DICOM Library..."
if $DOWNLOAD_CMD sample-osirix.dcm "https://www.osirix-viewer.com/wp-content/uploads/2016/01/sample.dcm" 2>/dev/null; then
    echo -e "${GREEN}   ✅ Downloaded: sample-osirix.dcm${NC}"
    DOWNLOADED=$((DOWNLOADED + 1))
else
    echo -e "${YELLOW}   ⚠️  Failed to download from Osirix${NC}"
fi

# 3. Download from OHIF Viewer repository (GitHub)
echo "3. Downloading from OHIF Viewer repository..."
# CT Scan sample
if $DOWNLOAD_CMD sample-ct.dcm "https://github.com/OHIF/Viewers/raw/master/public/dicom-files/CT/1.3.6.1.4.1.25403.345050719074.3824.20170125112931.1.dcm" 2>/dev/null; then
    echo -e "${GREEN}   ✅ Downloaded: sample-ct.dcm${NC}"
    DOWNLOADED=$((DOWNLOADED + 1))
else
    echo -e "${YELLOW}   ⚠️  Failed to download CT sample${NC}"
fi

# CR (X-Ray) sample
if $DOWNLOAD_CMD sample-xray.dcm "https://github.com/OHIF/Viewers/raw/master/public/dicom-files/CR/1.3.6.1.4.1.25403.345050719074.3824.20170125112931.2.dcm" 2>/dev/null; then
    echo -e "${GREEN}   ✅ Downloaded: sample-xray.dcm${NC}"
    DOWNLOADED=$((DOWNLOADED + 1))
else
    echo -e "${YELLOW}   ⚠️  Failed to download X-Ray sample${NC}"
fi

# MR sample
if $DOWNLOAD_CMD sample-mr.dcm "https://github.com/OHIF/Viewers/raw/master/public/dicom-files/MR/1.3.6.1.4.1.25403.345050719074.3824.20170125112931.3.dcm" 2>/dev/null; then
    echo -e "${GREEN}   ✅ Downloaded: sample-mr.dcm${NC}"
    DOWNLOADED=$((DOWNLOADED + 1))
else
    echo -e "${YELLOW}   ⚠️  Failed to download MR sample${NC}"
fi

echo ""
if [ $DOWNLOADED -gt 0 ]; then
    echo -e "${GREEN}✅ Successfully downloaded $DOWNLOADED DICOM file(s)!${NC}"
    echo ""
    echo "Downloaded files:"
    ls -lh *.dcm 2>/dev/null | awk '{print "  - " $9 " (" $5 ")"}'
else
    echo -e "${RED}❌ No files were downloaded.${NC}"
    echo ""
    echo "Manual download options:"
    echo "  1. Visit: https://www.dclunie.com/images/"
    echo "  2. Visit: https://www.osirix-viewer.com/resources/dicom-image-library/"
    echo "  3. Visit: https://github.com/OHIF/Viewers/tree/master/public/dicom-files"
fi

echo ""
echo -e "${BLUE}📋 Next Steps:${NC}"
echo ""
echo "  1. Start Orthanc:     ./scripts/start-local-orthanc.sh"
echo "  2. Start Next.js:      npm run dev"
echo "  3. Test upload:        ./scripts/test-dicom-local.sh"
echo "  4. Or upload manually: curl -u orthanc:orthanc -X POST http://localhost:8042/instances -F file=@test-data/dicom-samples/sample-xray.dcm"
echo ""
