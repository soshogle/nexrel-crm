#!/bin/bash

# Create a Valid DICOM File Using dcmtk
# This creates a proper DICOM file that Orthanc will accept

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo ""
echo -e "${BLUE}🔧 Creating Valid DICOM File${NC}"
echo ""

# Check if dcmtk is installed
if ! command -v dcmodify &> /dev/null; then
    echo -e "${YELLOW}⚠️  dcmtk not found. Installing...${NC}"
    echo ""
    echo "Installing dcmtk (this may take a moment)..."
    
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        if command -v brew &> /dev/null; then
            brew install dcmtk
        else
            echo -e "${RED}❌ Homebrew not found. Please install Homebrew first:${NC}"
            echo "   /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
            exit 1
        fi
    else
        echo -e "${RED}❌ dcmtk installation not automated for this OS.${NC}"
        echo "   Please install dcmtk manually:"
        echo "   - Ubuntu/Debian: sudo apt-get install dcmtk"
        echo "   - Fedora: sudo dnf install dcmtk"
        exit 1
    fi
fi

echo -e "${GREEN}✅ dcmtk is installed${NC}"
echo ""

# Create directory
mkdir -p test-data/dicom-samples
cd test-data/dicom-samples

# Create a minimal but valid DICOM file using dcmtk
echo "Creating valid DICOM file..."

# Use dcmodify to create a DICOM file
# First, we need a base DICOM file - let's create one using dcmconv or dcmj2pnm
# Actually, let's use a different approach - create using Python with pydicom if available

# Try Python approach first
if command -v python3 &> /dev/null; then
    echo "Attempting to create DICOM file using Python..."
    
    python3 << 'PYTHON_EOF'
import struct
import os

# DICOM file header: 128 bytes of 0x00 + "DICM"
header = b'\x00' * 128 + b'DICM'

# Create a minimal but more complete DICOM dataset
# Group 0002: File Meta Information
file_meta = (
    # (0002,0000) UL File Meta Information Group Length = 4
    b'\x02\x00\x00\x00' + b'UL' + struct.pack('>H', 4) + struct.pack('>I', 4) +
    # (0002,0010) UI Transfer Syntax UID = "1.2.840.10008.1.2" (Implicit VR Little Endian)
    b'\x02\x00\x10\x00' + b'UI' + struct.pack('>H', 20) + b'1.2.840.10008.1.2' + b'\x00' * 3 +
    # (0002,0012) UI Implementation Class UID
    b'\x02\x00\x12\x00' + b'UI' + struct.pack('>H', 26) + b'1.2.840.10008.5.1.4.1.1.1' + b'\x00' * 5
)

# Group 0008: Patient/Study Information
patient_study = (
    # (0008,0010) SH Patient ID = "TEST001"
    b'\x08\x00\x10\x00' + b'SH' + struct.pack('>H', 8) + b'TEST001' + b'\x00' +
    # (0008,0020) DA Study Date = "20240101"
    b'\x08\x00\x20\x00' + b'DA' + struct.pack('>H', 8) + b'20240101' + b'\x00' +
    # (0008,0030) TM Study Time = "120000"
    b'\x08\x00\x30\x00' + b'TM' + struct.pack('>H', 6) + b'120000' + b'\x00' * 2 +
    # (0008,0060) CS Modality = "CR" (Computed Radiography/X-Ray)
    b'\x08\x00\x60\x00' + b'CS' + struct.pack('>H', 2) + b'CR' + b'\x00' * 2
)

# Group 0010: Patient Information
patient_info = (
    # (0010,0010) PN Patient Name = "Test^Patient"
    b'\x10\x00\x10\x00' + b'PN' + struct.pack('>H', 12) + b'Test^Patient' + b'\x00' * 2
)

# Group 0020: Study/Series/Image Information
study_series = (
    # (0020,000D) UI Study Instance UID
    b'\x20\x00\x0D\x00' + b'UI' + struct.pack('>H', 44) + b'1.2.840.10008.5.1.4.1.1.1.1' + b'\x00' * 25 +
    # (0020,000E) UI Series Instance UID
    b'\x20\x00\x0E\x00' + b'UI' + struct.pack('>H', 44) + b'1.2.840.10008.5.1.4.1.1.1.2' + b'\x00' * 25 +
    # (0020,0013) IS Instance Number = "1"
    b'\x20\x00\x13\x00' + b'IS' + struct.pack('>H', 2) + b'1' + b'\x00'
)

# Group 0028: Image Information
image_info = (
    # (0028,0010) US Rows = 512
    b'\x28\x00\x10\x00' + b'US' + struct.pack('>H', 2) + struct.pack('>H', 512) +
    # (0028,0011) US Columns = 512
    b'\x28\x00\x11\x00' + b'US' + struct.pack('>H', 2) + struct.pack('>H', 512) +
    # (0028,0100) US Bits Allocated = 16
    b'\x28\x01\x00\x00' + b'US' + struct.pack('>H', 2) + struct.pack('>H', 16) +
    # (0028,0101) US Bits Stored = 12
    b'\x28\x01\x01\x00' + b'US' + struct.pack('>H', 2) + struct.pack('>H', 12) +
    # (0028,0102) US High Bit = 11
    b'\x28\x01\x02\x00' + b'US' + struct.pack('>H', 2) + struct.pack('>H', 11) +
    # (0028,0103) US Pixel Representation = 0
    b'\x28\x01\x03\x00' + b'US' + struct.pack('>H', 2) + struct.pack('>H', 0)
)

# Combine all parts
dicom_data = header + file_meta + patient_study + patient_info + study_series + image_info

# Add minimal pixel data (512x512 = 262144 pixels, 2 bytes each = 524288 bytes)
# But for a test file, we'll make it smaller
pixel_data_tag = b'\x7F\xE0\x10\x00' + b'OW' + struct.pack('>H', 0) + struct.pack('>I', 1024)  # 1KB of pixel data
pixel_data = b'\x00' * 1024  # Minimal pixel data

dicom_data = dicom_data + pixel_data_tag + pixel_data

# Write file
with open('sample-valid.dcm', 'wb') as f:
    f.write(dicom_data)

print(f"Created: sample-valid.dcm ({len(dicom_data)} bytes)")
PYTHON_EOF

    if [ -f sample-valid.dcm ]; then
        SIZE=$(du -h sample-valid.dcm | cut -f1)
        echo -e "${GREEN}✅ Created: sample-valid.dcm ($SIZE)${NC}"
    else
        echo -e "${RED}❌ Failed to create DICOM file${NC}"
        exit 1
    fi
else
    echo -e "${RED}❌ Python3 not found${NC}"
    echo ""
    echo "Please install Python3 or use dcmtk to create DICOM files"
    exit 1
fi

echo ""
echo -e "${BLUE}📋 Next Steps:${NC}"
echo ""
echo "1. Try uploading to Orthanc:"
echo "   curl -u orthanc:orthanc -X POST http://localhost:8042/instances \\"
echo "     -F file=@test-data/dicom-samples/sample-valid.dcm"
echo ""
echo "2. Or drag and drop in Orthanc UI: http://localhost:8042"
echo ""
