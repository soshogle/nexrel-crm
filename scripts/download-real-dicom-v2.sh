#!/bin/bash

# Download Real DICOM Files - Updated with reliable sources
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
    DOWNLOAD_CMD="curl -L -f --connect-timeout 10 -o"
elif command -v wget &> /dev/null; then
    DOWNLOAD_CMD="wget --timeout=10 -O"
else
    echo -e "${RED}❌ Neither curl nor wget found. Please install one.${NC}"
    exit 1
fi

echo -e "${GREEN}Downloading real DICOM files from public repositories...${NC}"
echo ""

DOWNLOADED=0

# Try downloading from multiple reliable sources
# 1. Try DICOM Library (DCLunie) - direct link
echo "1. Trying DICOM Library (dclunie.com)..."
if $DOWNLOAD_CMD sample-jpeg.dcm "https://www.dclunie.com/images/JPEGLosslessSample.dcm" 2>/dev/null && [ -f sample-jpeg.dcm ] && [ -s sample-jpeg.dcm ]; then
    echo -e "${GREEN}   ✅ Downloaded: sample-jpeg.dcm ($(du -h sample-jpeg.dcm | cut -f1))${NC}"
    DOWNLOADED=$((DOWNLOADED + 1))
else
    rm -f sample-jpeg.dcm 2>/dev/null
    echo -e "${YELLOW}   ⚠️  Failed to download from DCLunie${NC}"
fi

# 2. Try from GitHub raw content (OHIF)
echo "2. Trying OHIF Viewer repository (GitHub)..."
# Try a known working OHIF DICOM file
if $DOWNLOAD_CMD sample-ct.dcm "https://raw.githubusercontent.com/OHIF/Viewers/master/public/dicom-files/CT/1.3.6.1.4.1.25403.345050719074.3824.20170125112931.1.dcm" 2>/dev/null && [ -f sample-ct.dcm ] && [ -s sample-ct.dcm ]; then
    echo -e "${GREEN}   ✅ Downloaded: sample-ct.dcm ($(du -h sample-ct.dcm | cut -f1))${NC}"
    DOWNLOADED=$((DOWNLOADED + 1))
else
    rm -f sample-ct.dcm 2>/dev/null
    echo -e "${YELLOW}   ⚠️  Failed to download CT sample${NC}"
fi

# 3. Try creating a minimal valid DICOM file for testing
echo "3. Creating minimal test DICOM file..."
cat > create_minimal_dicom.py << 'PYTHON_EOF'
#!/usr/bin/env python3
"""
Create a minimal valid DICOM file for testing
"""
import struct

# DICOM file header (128 bytes of 0x00 + "DICM")
dicom_header = b'\x00' * 128 + b'DICM'

# Minimal DICOM dataset
# Group 0002: File Meta Information
# (0002,0000) UL File Meta Information Group Length = 4
file_meta_length = struct.pack('>I', 4)
file_meta_tag = b'\x02\x00\x00\x00'  # (0002,0000)
file_meta_vr = b'UL'  # Unsigned Long
file_meta_vl = struct.pack('>H', 4)  # Value Length = 4
file_meta_value = struct.pack('>I', 4)  # Value = 4

# (0002,0010) UI Transfer Syntax UID = "1.2.840.10008.1.2" (Implicit VR Little Endian)
transfer_syntax_tag = b'\x02\x00\x10\x00'
transfer_syntax_vr = b'UI'
transfer_syntax_uid = b'1.2.840.10008.1.2'
transfer_syntax_vl = struct.pack('>H', len(transfer_syntax_uid))
transfer_syntax_padded = transfer_syntax_uid + (b'\x00' * (len(transfer_syntax_uid) % 2))

# Group 0008: Patient Information
# (0008,0010) SH Patient ID = "TEST001"
patient_id_tag = b'\x08\x00\x10\x00'
patient_id_vr = b'SH'
patient_id_value = b'TEST001'
patient_id_vl = struct.pack('>H', len(patient_id_value))
patient_id_padded = patient_id_value + (b'\x00' * (len(patient_id_value) % 2))

# (0008,0020) DA Study Date = "20240101"
study_date_tag = b'\x08\x00\x20\x00'
study_date_vr = b'DA'
study_date_value = b'20240101'
study_date_vl = struct.pack('>H', len(study_date_value))
study_date_padded = study_date_value + (b'\x00' * (len(study_date_value) % 2))

# (0008,0030) TM Study Time = "120000"
study_time_tag = b'\x08\x00\x30\x00'
study_time_vr = b'TM'
study_time_value = b'120000'
study_time_vl = struct.pack('>H', len(study_time_value))
study_time_padded = study_time_value + (b'\x00' * (len(study_time_value) % 2))

# (0008,0060) CS Modality = "CR" (Computed Radiography/X-Ray)
modality_tag = b'\x08\x00\x60\x00'
modality_vr = b'CS'
modality_value = b'CR'
modality_vl = struct.pack('>H', len(modality_value))
modality_padded = modality_value + (b'\x00' * (len(modality_value) % 2))

# Combine all parts
dicom_data = (
    dicom_header +
    file_meta_tag + file_meta_vr + file_meta_vl + file_meta_value +
    transfer_syntax_tag + transfer_syntax_vr + transfer_syntax_vl + transfer_syntax_padded +
    patient_id_tag + patient_id_vr + patient_id_vl + patient_id_padded +
    study_date_tag + study_date_vr + study_date_vl + study_date_padded +
    study_time_tag + study_time_vr + study_time_vl + study_time_padded +
    modality_tag + modality_vr + modality_vl + modality_padded
)

with open('sample-minimal.dcm', 'wb') as f:
    f.write(dicom_data)

print("Created minimal DICOM file: sample-minimal.dcm")
PYTHON_EOF

if python3 create_minimal_dicom.py 2>/dev/null && [ -f sample-minimal.dcm ]; then
    echo -e "${GREEN}   ✅ Created: sample-minimal.dcm ($(du -h sample-minimal.dcm | cut -f1))${NC}"
    DOWNLOADED=$((DOWNLOADED + 1))
    rm -f create_minimal_dicom.py
else
    rm -f create_minimal_dicom.py sample-minimal.dcm 2>/dev/null
    echo -e "${YELLOW}   ⚠️  Failed to create minimal DICOM${NC}"
fi

# 4. Try downloading from alternative GitHub sources
echo "4. Trying alternative GitHub sources..."
# Try a smaller test file
if $DOWNLOAD_CMD sample-test.dcm "https://github.com/OHIF/Viewers/raw/master/public/dicom-files/CR/1.3.6.1.4.1.25403.345050719074.3824.20170125112931.2.dcm" 2>/dev/null && [ -f sample-test.dcm ] && [ -s sample-test.dcm ]; then
    echo -e "${GREEN}   ✅ Downloaded: sample-test.dcm ($(du -h sample-test.dcm | cut -f1))${NC}"
    DOWNLOADED=$((DOWNLOADED + 1))
else
    rm -f sample-test.dcm 2>/dev/null
    echo -e "${YELLOW}   ⚠️  Failed to download from alternative source${NC}"
fi

echo ""
if [ $DOWNLOADED -gt 0 ]; then
    echo -e "${GREEN}✅ Successfully downloaded/created $DOWNLOADED DICOM file(s)!${NC}"
    echo ""
    echo "Available files:"
    ls -lh *.dcm 2>/dev/null | awk '{print "  - " $9 " (" $5 ")"}'
    echo ""
    echo -e "${BLUE}📋 Next Steps:${NC}"
    echo ""
    echo "  1. Start Orthanc:     ./scripts/start-local-orthanc.sh"
    echo "  2. Start Next.js:      npm run dev"
    echo "  3. Test upload:        ./scripts/test-real-dicom.sh"
    echo ""
else
    echo -e "${RED}❌ No DICOM files were downloaded.${NC}"
    echo ""
    echo -e "${YELLOW}Manual download options:${NC}"
    echo ""
    echo "Option 1: Download from DICOM Library"
    echo "  Visit: https://www.dclunie.com/images/"
    echo "  Download any .dcm file and save to: test-data/dicom-samples/"
    echo ""
    echo "Option 2: Use Orthanc's built-in sample files"
    echo "  Start Orthanc and use the web UI to upload sample files"
    echo "  Visit: http://localhost:8042"
    echo ""
    echo "Option 3: Use your own DICOM files"
    echo "  Copy any .dcm files to: test-data/dicom-samples/"
    echo ""
fi

echo ""
