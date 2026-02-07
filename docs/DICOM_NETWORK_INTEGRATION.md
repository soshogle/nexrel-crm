# DICOM Network Integration Plan

## Overview
This document outlines the architecture and implementation plan for integrating DICOM network protocols (DICOM C-STORE, C-FIND, C-MOVE) to enable automatic import of X-ray images from dental imaging systems.

## Current State
- ✅ DICOM file upload support
- ✅ DICOM parsing and conversion
- ✅ DICOM viewer with AI analysis
- ❌ DICOM network integration (not yet implemented)

## Architecture

### Components

#### 1. DICOM Server (Orthanc or Custom)
**Option A: Orthanc (Recommended)**
- Open-source DICOM server
- RESTful API
- Web-based interface
- Supports C-STORE, C-FIND, C-MOVE
- Easy to deploy and configure

**Option B: Custom Node.js DICOM Server**
- Using `dcmjs` or `dicomweb-client`
- Full control over implementation
- More complex but customizable

#### 2. DICOM Network Service
- Listens for incoming DICOM images (C-STORE)
- Processes and stores images
- Converts to preview images
- Triggers AI analysis if configured

#### 3. Worklist Management (MWL)
- Query for scheduled studies
- Display in practice management system
- Link to patient records

## Implementation Phases

### Phase 1: DICOM Server Setup
1. **Deploy Orthanc Server**
   - Docker container or standalone installation
   - Configure AE Title, port, and storage
   - Set up authentication

2. **Network Configuration**
   - Configure firewall rules
   - Set up port forwarding (default: 4242)
   - Configure AE Title mapping

3. **Storage Integration**
   - Connect Orthanc to Canadian storage service
   - Configure automatic deletion/archival policies

### Phase 2: C-STORE Receiver
1. **Receive Incoming Images**
   - Configure Orthanc to receive C-STORE requests
   - Set up webhook/API endpoint for new images
   - Process incoming DICOM files

2. **Image Processing Pipeline**
   - Parse DICOM metadata
   - Match to patient records (by Patient ID or name)
   - Convert to preview images
   - Store in Canadian storage

3. **Notification System**
   - Notify users of new X-rays
   - Email/SMS alerts (optional)
   - In-app notifications

### Phase 3: C-FIND Query Support
1. **Query for Studies**
   - Implement C-FIND SCU (Service Class User)
   - Query remote DICOM systems
   - Display results in UI

2. **Study Retrieval**
   - Allow users to search for studies
   - Retrieve and import selected studies
   - Link to patient records

### Phase 4: Worklist Management (MWL)
1. **Modality Worklist**
   - Query scheduled studies
   - Display in practice calendar
   - Link appointments to X-ray studies

2. **Auto-Import**
   - Automatically import X-rays for scheduled appointments
   - Match by patient and date
   - Reduce manual work

## Technical Implementation

### DICOM Server Configuration

```yaml
# Orthanc Configuration (orthanc.json)
{
  "DicomAet": "NEXREL-CRM",
  "DicomPort": 4242,
  "DicomModalities": {
    "Carestream": ["CARESTREAM", "192.168.1.100", 104],
    "Planmeca": ["PLANMECA", "192.168.1.101", 104],
    "Sirona": ["SIRONA", "192.168.1.102", 104]
  },
  "StorageDirectory": "/var/lib/orthanc/db",
  "HttpPort": 8042,
  "HttpAuthenticationEnabled": true,
  "RegisteredUsers": {
    "nexrel": "password_hash"
  }
}
```

### API Endpoints

#### POST /api/dental/dicom/receive
- Webhook endpoint for Orthanc
- Receives notification of new DICOM image
- Processes and stores image

#### GET /api/dental/dicom/query
- Query remote DICOM systems
- Search for studies by patient/date
- Return list of available studies

#### POST /api/dental/dicom/import
- Import selected study from remote system
- Process and link to patient record

### Database Schema Extensions

```prisma
model DicomServer {
  id          String   @id @default(cuid())
  name        String   // "Carestream", "Planmeca", etc.
  aeTitle     String   // Application Entity Title
  host        String   // IP address or hostname
  port        Int      @default(104)
  isActive    Boolean  @default(true)
  userId      String   // Practice owner
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  user        User     @relation(fields: [userId], references: [id])
  
  @@index([userId])
}

model DicomStudy {
  id              String   @id @default(cuid())
  studyInstanceUid String   @unique // DICOM Study Instance UID
  patientId       String   // DICOM Patient ID
  patientName     String   // DICOM Patient Name
  studyDate       DateTime
  studyDescription String?
  modality        String   // "PANORAMIC", "BITEWING", etc.
  seriesCount     Int
  instanceCount   Int
  serverId         String?  // Which DICOM server it came from
  leadId           String?  // Linked patient record
  userId           String   // Practice owner
  status           String   @default("PENDING") // PENDING, PROCESSED, ERROR
  metadata         Json?    // Full DICOM metadata
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
  
  server           DicomServer? @relation(fields: [serverId], references: [id])
  lead             Lead?        @relation(fields: [leadId], references: [id])
  user             User         @relation(fields: [userId], references: [id])
  
  @@index([userId])
  @@index([leadId])
  @@index([studyInstanceUid])
  @@index([status])
}
```

## Integration with Major Systems

### Carestream
- **Protocol**: DICOM C-STORE
- **AE Title**: Configurable (default: "CARESTREAM")
- **Port**: 104 (standard DICOM port)
- **Configuration**: Configure Carestream system to send to Orthanc server

### Planmeca
- **Protocol**: DICOM C-STORE
- **AE Title**: Configurable (default: "PLANMECA")
- **Port**: 104
- **Additional**: Planmeca Romexis API (optional, for advanced features)

### Sirona (Dentsply Sirona)
- **Protocol**: DICOM C-STORE
- **AE Title**: Configurable (default: "SIRONA")
- **Port**: 104
- **Additional**: SIDEXIS API (optional)

### Vatech
- **Protocol**: DICOM C-STORE
- **AE Title**: Configurable (default: "VATECH")
- **Port**: 104

## Security Considerations

1. **Network Security**
   - Use VPN or private network for DICOM communication
   - Firewall rules to restrict access
   - TLS encryption for DICOM communication (DICOM TLS)

2. **Authentication**
   - Orthanc user authentication
   - API key authentication for webhooks
   - Role-based access control

3. **Data Privacy**
   - All images stored in Canadian storage (Law 25 compliant)
   - Encryption at rest
   - Audit logging for all DICOM operations

## Deployment Options

### Option 1: Cloud Deployment (Recommended)
- Deploy Orthanc on AWS/GCP/Azure (Canada region)
- Use managed services for reliability
- Auto-scaling capabilities

### Option 2: On-Premise Deployment
- Install Orthanc on practice server
- Direct connection to X-ray machines
- Lower latency, more control

### Option 3: Hybrid
- Orthanc on-premise for receiving
- Cloud storage for archival
- Best of both worlds

## Testing Strategy

1. **Unit Tests**
   - DICOM parsing functions
   - Image conversion
   - Metadata extraction

2. **Integration Tests**
   - DICOM server connection
   - C-STORE reception
   - Image processing pipeline

3. **End-to-End Tests**
   - Full workflow from X-ray machine to viewer
   - Patient matching
   - AI analysis integration

## Monitoring and Logging

1. **Metrics**
   - Number of images received per day
   - Processing time
   - Error rates
   - Storage usage

2. **Alerts**
   - DICOM server down
   - Processing failures
   - Storage quota warnings

3. **Logging**
   - All DICOM operations
   - Patient matching attempts
   - Error details

## Future Enhancements

1. **DICOMweb Support**
   - RESTful API alternative to DICOM network
   - Easier integration with modern systems
   - WADO (Web Access to DICOM Objects)

2. **Multi-Frame Support**
   - CBCT (Cone Beam CT) support
   - 3D reconstruction
   - Volume rendering

3. **Advanced Workflow**
   - Automatic routing based on rules
   - Quality control checks
   - Batch processing

## Resources

- [Orthanc Documentation](https://book.orthanc-server.com/)
- [DICOM Standard](https://www.dicomstandard.org/)
- [dcmjs Library](https://github.com/dcmjs-org/dcmjs)
- [DICOMweb Specification](https://www.dicomstandard.org/dicomweb/)

## Timeline Estimate

- **Phase 1**: 2-3 weeks (DICOM server setup)
- **Phase 2**: 3-4 weeks (C-STORE receiver)
- **Phase 3**: 2-3 weeks (C-FIND query)
- **Phase 4**: 2-3 weeks (Worklist management)

**Total**: 9-13 weeks for full implementation

## Next Steps

1. ✅ Complete DICOM parsing and conversion (DONE)
2. ✅ Build DICOM viewer (DONE)
3. ⏭️ Set up Orthanc server (test environment)
4. ⏭️ Implement C-STORE receiver
5. ⏭️ Test with sample DICOM files
6. ⏭️ Deploy to production
