# Dental/Orthodontist DICOM Architecture

## Key Clarifications

1. **IntelePACS is proprietary** - Not using it, just understanding the concept
2. **Focus: Dental/Orthodontist** - Not radiology (that comes later)
3. **Storage: External** - Images stored elsewhere, not on CRM
4. **Compression: Critical** - Images must be super compressed
5. **Reference: Dentitek & Top Imaging Companies** - How they work

---

## How Dentitek & Top Dental Imaging Companies Work

### Architecture Pattern:

```
X-Ray Machine → DICOM Server (Orthanc/VNA) → Cloud Storage (Compressed)
                      ↓
                Your CRM (Management Layer)
                      ↓
            • Patient Management
            • Treatment Planning
            • Appointment Scheduling
            • Image Viewing (from storage)
            • AI Analysis
```

**Key Points:**
- **Images stored in cloud storage** (AWS S3, Azure Blob, Google Cloud)
- **Highly compressed** (DICOM → JPEG/PNG with compression)
- **CRM doesn't store images** - Just references/metadata
- **Fast retrieval** - Images loaded on-demand from storage
- **Scalable** - Storage scales independently

---

## Your System Architecture (Recommended)

### Current vs. Recommended:

**Current:**
```
X-Ray → Orthanc → Your CRM → Canadian Storage (encrypted)
                              (Storing full DICOM files)
```

**Recommended (Like Dentitek):**
```
X-Ray → Orthanc (VNA) → Cloud Storage (Compressed Images)
              ↓
        Your CRM (Management)
              ↓
    • Patient Records
    • Treatment Plans
    • Appointments
    • Image References (point to storage)
    • Viewing (loads from storage)
```

---

## What You Need to Add/Adjust

### 1. Image Compression & External Storage ⚠️ CRITICAL

**Current:** Storing full DICOM files in Canadian Storage

**Needed:**
- **Compress DICOM to JPEG/PNG** (high compression ratio)
- **Store compressed images in cloud storage** (AWS S3, Azure, etc.)
- **Store only references in CRM** (URLs, metadata)
- **On-demand loading** (load images when viewing)

**Why:**
- DICOM files are large (5-50MB each)
- Compressed JPEG/PNG much smaller (500KB-2MB)
- Cloud storage is cheaper and scalable
- CRM database stays fast (no large files)

**How Dentitek Does It:**
- Receives DICOM from X-ray machines
- Converts to compressed JPEG/PNG
- Stores in cloud storage (S3, Azure)
- CRM stores only image URLs and metadata
- Images loaded on-demand when viewing

---

### 2. Multi-VNA Support (For Dental Context)

**What is VNA Routing for Dental?**

**Scenario:** A dental practice group has multiple locations:
- **Location A:** Uses Orthanc VNA
- **Location B:** Uses different VNA (e.g., DICOMGrid, Ambra)
- **Location C:** Uses cloud VNA (e.g., CloudPACS)

**Your CRM needs to:**
- Route images to appropriate VNA based on:
  - **Practice location**
  - **X-ray machine** (which machine sent it)
  - **Patient's primary location**
  - **Storage preferences** (some prefer cloud, some on-premise)

**Routing Rules Examples:**
- "All images from Dr. Smith's office → Orthanc VNA"
- "All panoramic X-rays → Cloud VNA (for backup)"
- "All CBCT scans → Premium VNA (better storage)"

**Why Needed:**
- Multi-location practices use different VNAs
- Some prefer cloud, some prefer on-premise
- Backup/redundancy (store in multiple VNAs)
- Compliance (some regions require specific storage)

---

### 3. Workflow Management (Dental Context)

**NOT Radiology Workflow** - This is DENTAL workflow:

**Dental Workflow Includes:**
- **Dentist Assignment:** Which dentist is treating this patient?
- **Treatment Planning:** Create treatment plans based on X-rays
- **Appointment Scheduling:** Schedule follow-ups based on X-ray findings
- **Patient Communication:** Share X-rays with patients
- **Insurance Claims:** Attach X-rays to insurance claims
- **Referrals:** Send X-rays to specialists (orthodontists, oral surgeons)

**Example Workflow:**
1. Patient comes in for cleaning
2. X-ray taken → Stored in VNA
3. Dentist reviews X-ray in CRM
4. Finds cavity → Creates treatment plan
5. Schedules filling appointment
6. Shares X-ray with patient via portal
7. Attaches X-ray to insurance claim

**Why Needed:**
- Coordinate patient care
- Track treatment progress
- Manage appointments
- Handle insurance
- Patient communication

---

## Detailed Architecture

### Image Flow:

```
┌─────────────┐
│ X-Ray Machine│
└──────┬───────┘
       │ DICOM C-STORE
       ↓
┌─────────────┐
│  Orthanc     │ ← Receives DICOM
│  (VNA)       │
└──────┬───────┘
       │
       ├─→ Convert DICOM → Compressed JPEG/PNG
       │
       ↓
┌─────────────┐
│ Cloud Storage│ ← Stores compressed images
│ (AWS/Azure)  │   (Super compressed, cheap)
└──────┬───────┘
       │
       ↓ Returns URL
┌─────────────┐
│  Your CRM   │ ← Stores only:
│             │   • Image URL
│             │   • Metadata
│             │   • Patient ID
│             │   • Treatment info
└─────────────┘
```

---

## Compression Strategy

### Current Problem:
- DICOM files: 5-50MB each
- 1000 X-rays = 5-50GB
- Expensive storage
- Slow loading

### Solution (Like Dentitek):

**Step 1: Convert DICOM to Image**
- Extract pixel data from DICOM
- Convert to JPEG/PNG
- Apply optimal compression

**Step 2: Multiple Resolutions**
- **Thumbnail:** 200x200px (50KB) - For lists
- **Preview:** 800x800px (200KB) - For quick view
- **Full Resolution:** Original size (1-2MB) - For detailed analysis

**Step 3: Store in Cloud**
- AWS S3: $0.023/GB/month
- Azure Blob: $0.018/GB/month
- Much cheaper than database storage

**Step 4: On-Demand Loading**
- Load thumbnail immediately
- Load preview when viewing
- Load full resolution when zooming/analyzing

**Result:**
- 90% storage reduction
- 10x faster loading
- Much cheaper
- Scalable

---

## Multi-VNA Routing (Dental Context)

### When You Need Multiple VNAs:

**Scenario 1: Multi-Location Practice**
- Location A → Orthanc VNA (on-premise)
- Location B → Cloud VNA (remote)
- Location C → Different VNA

**Routing Rule:**
```
IF patient.location == "Location A"
  THEN route to Orthanc VNA
ELSE IF patient.location == "Location B"
  THEN route to Cloud VNA
```

**Scenario 2: Backup/Redundancy**
- Primary: Orthanc VNA
- Backup: Cloud VNA (for disaster recovery)

**Routing Rule:**
```
Route to Orthanc VNA (primary)
ALSO route to Cloud VNA (backup)
```

**Scenario 3: Image Type Based**
- Panoramic X-rays → Standard VNA
- CBCT scans → Premium VNA (better storage)
- Intraoral → Standard VNA

**Routing Rule:**
```
IF imageType == "CBCT"
  THEN route to Premium VNA
ELSE
  THEN route to Standard VNA
```

---

## Workflow Management (Dental, Not Radiology)

### What Dental Workflow Includes:

**1. Patient Management:**
- Patient records
- Treatment history
- X-ray history
- Insurance information

**2. Treatment Planning:**
- Create treatment plans
- Link X-rays to treatments
- Track treatment progress
- Cost estimation

**3. Appointment Management:**
- Schedule appointments
- Link X-rays to appointments
- Reminders and follow-ups

**4. Image Management:**
- View X-rays
- Compare X-rays (before/after)
- Share with patients
- Attach to insurance claims

**5. Communication:**
- Patient portal (view X-rays)
- Email X-rays to patients
- Share with specialists
- Insurance submissions

**NOT Radiology Workflow:**
- ❌ Radiologist assignment (not needed for dental)
- ❌ Reading workflow (dentists read their own X-rays)
- ❌ Report distribution (not applicable)

---

## Comparison: Dentitek vs. Your System

### Dentitek Architecture:

```
X-Ray Machine
    ↓
DICOM Server (receives)
    ↓
Convert to JPEG (compressed)
    ↓
Store in Cloud Storage (AWS S3)
    ↓
Dentitek CRM (management)
    • Patient records
    • Treatment plans
    • Appointments
    • Image URLs (point to storage)
    • Viewing (loads from storage)
```

### Your System (Recommended):

```
X-Ray Machine
    ↓
Orthanc (VNA - receives DICOM)
    ↓
Convert DICOM → Compressed JPEG/PNG
    ↓
Store in Cloud Storage (AWS/Azure)
    ↓
Your CRM (management)
    • Patient records
    • Treatment plans
    • Appointments
    • Odontograms
    • Image URLs (point to storage)
    • Viewing (loads from storage)
    • AI Analysis
```

**Key Similarities:**
- ✅ External storage (not in CRM)
- ✅ Compressed images
- ✅ On-demand loading
- ✅ Management layer

**Your Advantages:**
- ✅ AI Analysis
- ✅ 3D Odontogram
- ✅ Treatment Plan Builder
- ✅ More dental-specific features

---

## What to Prioritize

### Phase 1: Compression & External Storage (CRITICAL)

**Why:** This is how Dentitek works. Essential for scalability.

**What:**
1. Convert DICOM to compressed JPEG/PNG
2. Store in cloud storage (AWS S3, Azure)
3. Store only URLs in CRM
4. On-demand image loading

**Result:** 90% storage reduction, much faster, cheaper

---

### Phase 2: Multi-VNA Support (IMPORTANT)

**Why:** Multi-location practices need this.

**What:**
1. Support multiple VNAs
2. Routing rules engine
3. Location-based routing
4. Image type-based routing

**Result:** Works with any VNA setup

---

### Phase 3: Dental Workflow (IMPORTANT)

**Why:** This is your core value - managing dental practice.

**What:**
1. Treatment planning with X-rays
2. Appointment scheduling
3. Patient communication
4. Insurance claims with X-rays

**Result:** Complete dental practice management

---

## Summary

### What You Need:

1. **Compression & External Storage** ⚠️ CRITICAL
   - Convert DICOM to compressed JPEG/PNG
   - Store in cloud storage (not CRM)
   - Store only URLs in CRM
   - Like Dentitek does

2. **Multi-VNA Support** ⚠️ IMPORTANT
   - Route images to different VNAs
   - Based on location, image type, preferences
   - For multi-location practices

3. **Dental Workflow** ⚠️ IMPORTANT
   - Treatment planning
   - Appointment management
   - Patient communication
   - Insurance claims
   - NOT radiology workflow

### What You DON'T Need (For Now):

- ❌ IntelePACS integration (proprietary)
- ❌ Radiologist workflow (radiology, not dental)
- ❌ Reading workflow (dentists read their own)
- ❌ Report distribution (not applicable)

---

## Next Steps

1. **Implement Compression & External Storage** (Phase 1)
   - This is how Dentitek works
   - Essential for scalability
   - Reduces costs significantly

2. **Add Multi-VNA Support** (Phase 2)
   - For multi-location practices
   - Flexible routing

3. **Enhance Dental Workflow** (Phase 3)
   - Treatment planning
   - Patient management
   - Insurance integration

**Focus:** Dental/Orthodontist workflows first, radiology later.

---

**Bottom Line:** Your system should work like Dentitek - compressed images in cloud storage, CRM manages workflow, not storage. Multi-VNA support for flexibility, dental workflow for practice management.
