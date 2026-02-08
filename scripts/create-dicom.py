#!/usr/bin/env python3
"""
Create a valid DICOM file for testing Orthanc integration.
This creates a minimal but complete DICOM file that Orthanc will accept.
"""

import struct
import os

def create_dicom_file(output_path='test-data/dicom-samples/sample-valid.dcm'):
    """Create a valid DICOM file with all required tags."""
    
    # Ensure directory exists
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    # DICOM file header: 128 bytes of 0x00 + "DICM"
    header = b'\x00' * 128 + b'DICM'
    
    # Group 0002: File Meta Information
    # (0002,0000) UL File Meta Information Group Length
    file_meta_length = 132  # Length of all file meta elements
    file_meta = (
        b'\x02\x00\x00\x00' + b'UL' + struct.pack('>H', 4) + struct.pack('>I', file_meta_length) +
        # (0002,0001) OB File Preamble (not used, but some parsers expect it)
        # (0002,0002) UI Media Storage SOP Class UID = "1.2.840.10008.5.1.4.1.1.1" (CR Image Storage)
        b'\x02\x00\x02\x00' + b'UI' + struct.pack('>H', 26) + b'1.2.840.10008.5.1.4.1.1.1' + b'\x00' * 5 +
        # (0002,0003) UI Media Storage SOP Instance UID
        b'\x02\x00\x03\x00' + b'UI' + struct.pack('>H', 64) + b'1.2.840.10008.5.1.4.1.1.1.999999.123456789' + b'\x00' * 30 +
        # (0002,0010) UI Transfer Syntax UID = "1.2.840.10008.1.2" (Implicit VR Little Endian)
        b'\x02\x00\x10\x00' + b'UI' + struct.pack('>H', 20) + b'1.2.840.10008.1.2' + b'\x00' * 3 +
        # (0002,0012) UI Implementation Class UID
        b'\x02\x00\x12\x00' + b'UI' + struct.pack('>H', 26) + b'1.2.840.10008.5.1.4.1.1.1' + b'\x00' * 5 +
        # (0002,0013) SH Implementation Version Name
        b'\x02\x00\x13\x00' + b'SH' + struct.pack('>H', 16) + b'ORTHANC_TEST' + b'\x00' * 3
    )
    
    # Group 0008: Patient/Study Information
    patient_study = (
        # (0008,0005) CS Specific Character Set = "ISO_IR 192" (UTF-8)
        b'\x08\x00\x05\x00' + b'CS' + struct.pack('>H', 10) + b'ISO_IR 192' + b'\x00' +
        # (0008,0010) SH Patient ID = "TEST001"
        b'\x08\x00\x10\x00' + b'SH' + struct.pack('>H', 8) + b'TEST001' + b'\x00' +
        # (0008,0020) DA Study Date = "20240101"
        b'\x08\x00\x20\x00' + b'DA' + struct.pack('>H', 8) + b'20240101' + b'\x00' +
        # (0008,0030) TM Study Time = "120000"
        b'\x08\x00\x30\x00' + b'TM' + struct.pack('>H', 6) + b'120000' + b'\x00' * 2 +
        # (0008,0050) SH Accession Number = "ACC001"
        b'\x08\x00\x50\x00' + b'SH' + struct.pack('>H', 8) + b'ACC001' + b'\x00' +
        # (0008,0060) CS Modality = "CR" (Computed Radiography/X-Ray)
        b'\x08\x00\x60\x00' + b'CS' + struct.pack('>H', 2) + b'CR' + b'\x00' * 2
    )
    
    # Group 0010: Patient Information
    patient_info = (
        # (0010,0010) PN Patient Name = "Test^Patient"
        b'\x10\x00\x10\x00' + b'PN' + struct.pack('>H', 12) + b'Test^Patient' + b'\x00' * 2 +
        # (0010,0020) LO Patient ID (duplicate, but some systems expect it)
        b'\x10\x00\x20\x00' + b'LO' + struct.pack('>H', 8) + b'TEST001' + b'\x00' +
        # (0010,0030) DA Patient Birth Date = "19800101"
        b'\x10\x00\x30\x00' + b'DA' + struct.pack('>H', 8) + b'19800101' + b'\x00' +
        # (0010,0040) CS Patient Sex = "M"
        b'\x10\x00\x40\x00' + b'CS' + struct.pack('>H', 2) + b'M' + b'\x00' * 2
    )
    
    # Group 0020: Study/Series/Image Information
    study_series = (
        # (0020,000D) UI Study Instance UID
        b'\x20\x00\x0D\x00' + b'UI' + struct.pack('>H', 44) + b'1.2.840.10008.5.1.4.1.1.1.999' + b'\x00' * 20 +
        # (0020,000E) UI Series Instance UID
        b'\x20\x00\x0E\x00' + b'UI' + struct.pack('>H', 44) + b'1.2.840.10008.5.1.4.1.1.1.888' + b'\x00' * 20 +
        # (0020,0010) SH Study ID = "STUDY001"
        b'\x20\x00\x10\x00' + b'SH' + struct.pack('>H', 10) + b'STUDY001' + b'\x00' * 2 +
        # (0020,0011) IS Series Number = "1"
        b'\x20\x00\x11\x00' + b'IS' + struct.pack('>H', 2) + b'1' + b'\x00' +
        # (0020,0013) IS Instance Number = "1"
        b'\x20\x00\x13\x00' + b'IS' + struct.pack('>H', 2) + b'1' + b'\x00'
    )
    
    # Group 0028: Image Information
    image_info = (
        # (0028,0002) US Samples Per Pixel = 1
        b'\x28\x00\x02\x00' + b'US' + struct.pack('>H', 2) + struct.pack('>H', 1) +
        # (0028,0004) CS Photometric Interpretation = "MONOCHROME2"
        b'\x28\x00\x04\x00' + b'CS' + struct.pack('>H', 12) + b'MONOCHROME2' + b'\x00' +
        # (0028,0010) US Rows = 256
        b'\x28\x00\x10\x00' + b'US' + struct.pack('>H', 2) + struct.pack('>H', 256) +
        # (0028,0011) US Columns = 256
        b'\x28\x00\x11\x00' + b'US' + struct.pack('>H', 2) + struct.pack('>H', 256) +
        # (0028,0100) US Bits Allocated = 16
        b'\x28\x01\x00\x00' + b'US' + struct.pack('>H', 2) + struct.pack('>H', 16) +
        # (0028,0101) US Bits Stored = 12
        b'\x28\x01\x01\x00' + b'US' + struct.pack('>H', 2) + struct.pack('>H', 12) +
        # (0028,0102) US High Bit = 11
        b'\x28\x01\x02\x00' + b'US' + struct.pack('>H', 2) + struct.pack('>H', 11) +
        # (0028,0103) US Pixel Representation = 0 (unsigned)
        b'\x28\x01\x03\x00' + b'US' + struct.pack('>H', 2) + struct.pack('>H', 0)
    )
    
    # Combine all parts
    dicom_data = header + file_meta + patient_study + patient_info + study_series + image_info
    
    # Add pixel data (256x256 = 65536 pixels, 2 bytes each = 131072 bytes)
    # Create a simple gradient pattern for visualization
    pixel_data_tag = b'\x7F\xE0\x10\x00' + b'OW' + struct.pack('>H', 0) + struct.pack('>I', 131072)
    pixel_data = bytearray()
    for y in range(256):
        for x in range(256):
            # Create a simple gradient pattern
            value = ((x + y) % 4096)  # 12-bit value
            pixel_data.extend(struct.pack('>H', value))
    
    dicom_data = dicom_data + pixel_data_tag + bytes(pixel_data)
    
    # Write file
    with open(output_path, 'wb') as f:
        f.write(dicom_data)
    
    file_size = len(dicom_data)
    print(f"✅ Created: {output_path}")
    print(f"   Size: {file_size:,} bytes ({file_size / 1024:.1f} KB)")
    print(f"   Patient ID: TEST001")
    print(f"   Patient Name: Test^Patient")
    print(f"   Modality: CR (X-Ray)")
    print(f"   Image Size: 256x256 pixels")
    print("")
    print("📋 Next steps:")
    print("   1. Upload to Orthanc:")
    print(f"      curl -u orthanc:orthanc -X POST http://localhost:8042/instances \\")
    print(f"        -F file=@{output_path}")
    print("")
    print("   2. Or drag and drop in Orthanc UI: http://localhost:8042")
    
    return output_path

if __name__ == '__main__':
    create_dicom_file()
