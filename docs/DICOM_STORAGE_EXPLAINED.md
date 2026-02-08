# Where DICOM/X-Ray Data is Stored

## 📊 Two-Part Storage System

Your DICOM/X-ray data is stored in **two places**:

### 1. **Database (PostgreSQL)** - Metadata & References
### 2. **File Storage (AWS S3 Canada)** - Actual Files

---

## 🗄️ Part 1: PostgreSQL Database

### Database Type
- **Provider**: PostgreSQL
- **Location**: Your Neon database (cloud-hosted PostgreSQL)
- **Connection**: Via `DATABASE_URL` environment variable

### Table: `DentalXRay`

**What's stored here:**
- ✅ Patient ID (`leadId`) - Links to patient record
- ✅ Practice ID (`userId`) - Links to your practice
- ✅ X-ray type (PANORAMIC, BITEWING, PERIAPICAL, etc.)
- ✅ Date taken
- ✅ Teeth included (tooth numbers)
- ✅ AI analysis results (if analyzed)
- ✅ **File paths/references** (not the actual files)
- ✅ Notes and metadata

**Example Record:**
```json
{
  "id": "cmlalxjgf0009pu1xp31znkxh",
  "leadId": "patient-123",
  "userId": "practice-456",
  "xrayType": "PANORAMIC",
  "dateTaken": "2026-02-08T10:30:00Z",
  "dicomFile": "dicom/b7fb1fb4-142e5a15-333ae197-298b1626-11f8833b.dcm",
  "imageFile": "dicom/b7fb1fb4-142e5a15-333ae197-298b1626-11f8833b.png",
  "notes": "Auto-imported from DICOM server"
}
```

**Why store metadata in database?**
- Fast queries (find all X-rays for a patient)
- Relationships (link to patient, practice)
- Searchable (by date, type, patient)
- Indexed for performance

---

## 📁 Part 2: AWS S3 File Storage (Canada)

### Storage Service
- **Provider**: AWS S3
- **Region**: `ca-central-1` (Canada Central - Montreal/Toronto)
- **Service**: `CanadianStorageService`
- **Compliance**: Law 25 compliant (data stays in Canada)

### What's stored here:

#### 1. **Original DICOM File**
- **Path**: `dicom/{instanceId}.dcm`
- **Size**: ~1.6MB (full DICOM file)
- **Format**: Original DICOM format
- **Encrypted**: Yes (AES-256-GCM encryption)
- **Purpose**: Original medical imaging data

#### 2. **Converted Image File**
- **Path**: `dicom/{instanceId}.png`
- **Size**: ~200-500KB (compressed)
- **Format**: PNG image
- **Encrypted**: Yes (AES-256-GCM encryption)
- **Purpose**: For display in dashboard/web interface

### Storage Structure:
```
AWS S3 Bucket (Canada)
└── dicom/
    ├── b7fb1fb4-142e5a15-333ae197-298b1626-11f8833b.dcm  (original DICOM)
    └── b7fb1fb4-142e5a15-333ae197-298b1626-11f8833b.png  (converted image)
```

---

## 🔄 Complete Flow

### When a DICOM file arrives:

1. **Orthanc receives DICOM** → Stores temporarily
2. **Webhook triggers** → Notifies Next.js app
3. **Next.js downloads** → Gets DICOM file from Orthanc
4. **Processes file**:
   - Extracts metadata (patient ID, date, type)
   - Converts DICOM to PNG image
   - Compresses image
5. **Uploads to S3**:
   - Original DICOM → `dicom/{id}.dcm` (encrypted)
   - Converted image → `dicom/{id}.png` (encrypted)
6. **Saves to PostgreSQL**:
   - Creates `DentalXRay` record
   - Stores file paths (references to S3)
   - Links to patient (`leadId`)

---

## 🔐 Security & Compliance

### Law 25 Compliance
- ✅ **Data residency**: Files stored in Canada (`ca-central-1`)
- ✅ **Encryption**: AES-256-GCM encryption at rest
- ✅ **Access control**: Only authorized users can access
- ✅ **Audit trail**: Access logs tracked

### Encryption
- **At rest**: Files encrypted before upload to S3
- **In transit**: HTTPS/TLS for all transfers
- **Keys**: Encryption keys managed securely

---

## 📍 Where to Find Your Data

### In Your Application:
1. **Database**: Query `DentalXRay` table via Prisma
2. **Files**: Access via `CanadianStorageService`
3. **Dashboard**: X-rays displayed via `/api/dental/xrays` endpoint

### Database Query Example:
```typescript
// Get all X-rays for a patient
const xrays = await prisma.dentalXRay.findMany({
  where: { leadId: 'patient-123' },
  orderBy: { dateTaken: 'desc' }
});
```

### File Access Example:
```typescript
// Download DICOM file from S3
const storageService = new CanadianStorageService();
const file = await storageService.downloadDocument(
  'dicom/b7fb1fb4-142e5a15-333ae197-298b1626-11f8833b.dcm',
  encryptionKey
);
```

---

## 💾 Storage Summary

| Data Type | Location | Size | Encrypted |
|-----------|----------|------|-----------|
| **Metadata** | PostgreSQL Database | ~1KB per record | ✅ Yes |
| **DICOM File** | AWS S3 (Canada) | ~1.6MB | ✅ Yes |
| **Image File** | AWS S3 (Canada) | ~200-500KB | ✅ Yes |

---

## 🎯 Key Points

1. **Database stores metadata** - Patient links, dates, types, file paths
2. **S3 stores actual files** - DICOM and image files (encrypted)
3. **Everything in Canada** - Law 25 compliant storage
4. **Encrypted at rest** - All files encrypted before storage
5. **Fast access** - Database queries are fast, files loaded on-demand

---

## 🔍 How to Verify Storage

### Check Database:
```sql
SELECT * FROM "DentalXRay" ORDER BY "createdAt" DESC LIMIT 10;
```

### Check S3:
```bash
aws s3 ls s3://your-bucket/dicom/ --region ca-central-1
```

### Check in App:
- Navigate to patient record
- View X-rays section
- Files are loaded from S3 on-demand

---

**Bottom Line**: 
- **Metadata** → PostgreSQL database (fast queries, relationships)
- **Files** → AWS S3 Canada (encrypted, Law 25 compliant)
- **Both** work together to provide secure, fast access to X-ray data
