# Manual Testing Steps: VNA & Workflow Actions

## ✅ Migration Status

The migration file is ready at: `prisma/migrations/20260206010000_add_vna_configuration/migration.sql`

**To run the migration**, execute in your terminal:
```bash
cd /Users/cyclerun/Desktop/nexrel-crm
source .env.local  # or export DATABASE_URL="your_url"
npx prisma migrate dev --name add_vna_configuration
npx prisma generate
```

## 🧪 Manual Testing Guide

### Step 1: Verify Migration Applied

1. Open Prisma Studio:
   ```bash
   npx prisma studio
   ```
2. Look for `VnaConfiguration` table in the list
3. ✅ Verify table exists with correct columns

### Step 2: Start Development Server

```bash
npm run dev
```

Wait for server to start (usually http://localhost:3000)

### Step 3: Test VNA Configurations

#### 3.1 Access VNA Configuration UI

1. Navigate to: `http://localhost:3000/dashboard/dental/admin`
2. Scroll down to **"VNA Configuration"** section
3. Click **"Configure VNAs"** button
4. ✅ Verify: Modal opens with VNA configuration form

#### 3.2 Create Test VNA #1: Orthanc

1. Click **"Add VNA"**
2. Fill in:
   - **Name**: `Local Orthanc Server`
   - **Type**: `Orthanc DICOM Server`
   - **Host**: `localhost`
   - **Port**: `8042`
   - **AE Title**: `NEXREL-CRM`
   - **Username**: `orthanc`
   - **Password**: `orthanc`
   - **Priority**: `0`
   - ✅ Check **"Set as default VNA"**
3. Click **"Create VNA"**
4. ✅ Verify: VNA appears in list
5. Click **"Test"** button
6. ✅ Verify: Connection test runs (may show success/failure based on Orthanc availability)

#### 3.3 Create Test VNA #2: AWS S3

1. Click **"Add VNA"**
2. Fill in:
   - **Name**: `AWS S3 Storage`
   - **Type**: `AWS S3 Storage`
   - **Bucket**: `nexrel-dental-images`
   - **Region**: `ca-central-1`
   - **Path Prefix**: `dicom/`
   - **Priority**: `1`
3. Click **"Create VNA"**
4. ✅ Verify: VNA appears in list

#### 3.4 Edit VNA

1. Click **Edit** button (pencil icon) on any VNA
2. Change the name
3. Click **"Update VNA"**
4. ✅ Verify: Changes are saved

#### 3.5 Delete VNA

1. Click **Delete** button (trash icon) on a test VNA
2. Confirm deletion
3. ✅ Verify: VNA is removed from list

### Step 4: Test Routing Rules

#### 4.1 Create Routing Rule #1: CBCT Route

1. In VNA Configuration modal, scroll to **"Routing Rules"**
2. Click **"Add Rule"**
3. Fill in:
   - **Rule Name**: `Route CBCT to Cloud`
   - **Priority**: `0`
   - **Conditions**:
     - **Image Type**: Select `CBCT`
   - **Action**:
     - **Route to VNA**: Select `AWS S3 Storage`
     - ✅ Check **"Compress before routing"**
4. Click **"Create Rule"**
5. ✅ Verify: Rule appears in list with correct priority

#### 4.2 Create Routing Rule #2: Location-Based

1. Click **"Add Rule"**
2. Fill in:
   - **Rule Name**: `Main Clinic Route`
   - **Priority**: `1`
   - **Conditions**:
     - **Location**: `Main Clinic`
   - **Action**:
     - **Route to VNA**: Select `Local Orthanc Server`
3. Click **"Create Rule"**
4. ✅ Verify: Rule appears below first rule (priority 1)

#### 4.3 Verify Rule Ordering

- ✅ Verify: Rules are displayed in priority order (0, 1, 2...)
- ✅ Verify: Lower number = higher priority (shown first)

#### 4.4 Edit Rule

1. Click **"Edit"** on a rule
2. Change priority or conditions
3. Click **"Update Rule"**
4. ✅ Verify: Changes are saved

#### 4.5 Delete Rule

1. Click **"Delete"** (trash icon) on a rule
2. Confirm deletion
3. ✅ Verify: Rule is removed

### Step 5: Test Workflow Actions

#### 5.1 Access Workflow Builder

1. Navigate to: `http://localhost:3000/ai-employees` (or workflow builder page)
2. Click **"Create Workflow"** or **"Workflow Templates"**

#### 5.2 Create Test Workflow: X-Ray Upload

1. **Workflow Name**: `Test X-Ray Workflow`
2. **Trigger**: Select `XRAY_UPLOADED` (or `DENTAL_XRAY_UPLOADED`)
3. **Actions**:
   - Action 1: `SEND_TREATMENT_UPDATE_TO_PATIENT` (delay: 0)
   - Action 2: `CREATE_CLINICAL_NOTE` (delay: 5 minutes)
   - Action 3: `SCHEDULE_FOLLOWUP_APPOINTMENT` (delay: 1440 minutes)
4. Save and activate workflow
5. ✅ Verify: Workflow is created and active

#### 5.3 Test Workflow Execution

1. Navigate to Clinical Dashboard
2. Upload a test X-ray:
   - Select a patient
   - Click **"X-Ray Analysis"** card
   - Upload a test DICOM file
3. ✅ Verify: Workflow is triggered
4. Check workflow execution logs:
   - Navigate to workflow instances
   - ✅ Verify: Actions execute in order
   - ✅ Verify: Delays are respected

#### 5.4 Test Admin Workflow Actions

Create another workflow:

1. **Workflow Name**: `Appointment Reminder`
2. **Trigger**: `APPOINTMENT_SCHEDULED`
3. **Actions**:
   - `SEND_APPOINTMENT_REMINDER` (delay: 10080 minutes / 1 week)
   - `SEND_APPOINTMENT_REMINDER` (delay: 1440 minutes / 1 day)
4. Create a test appointment
5. ✅ Verify: Reminders are scheduled

### Step 6: Test VNA Routing Integration

#### 6.1 Upload X-ray with Routing

1. Upload a CBCT X-ray
2. ✅ Verify: Image is routed to AWS S3 Storage (based on Rule #1)
3. Check VNA logs/storage to confirm

#### 6.2 Test Default Routing

1. Upload a regular X-ray (not CBCT, no location match)
2. ✅ Verify: Image is routed to default VNA (Local Orthanc Server)

#### 6.3 Test Location-Based Routing

1. Set patient location to "Main Clinic"
2. Upload X-ray
3. ✅ Verify: Image is routed to Local Orthanc Server (based on Rule #2)

## ✅ Success Criteria

- ✅ VNA configurations can be created, edited, and deleted
- ✅ Routing rules work correctly based on conditions
- ✅ Workflow actions execute successfully
- ✅ X-rays are routed to correct VNA based on rules
- ✅ Workflow triggers fire correctly
- ✅ All action types function as expected

## 🐛 Troubleshooting

### VNA Connection Test Fails
- Check if Orthanc is running: `docker ps | grep orthanc`
- Verify credentials are correct
- Check network connectivity

### Workflow Actions Not Executing
- Check workflow is ACTIVE
- Verify trigger conditions are met
- Check workflow execution logs
- Verify Prisma Client is up to date (`npx prisma generate`)

### Routing Rules Not Working
- Verify VNA configurations are active
- Check rule priority order
- Ensure default VNA is set
- Check X-ray upload logs for routing decisions

### Migration Issues
- Verify DATABASE_URL is set correctly
- Check database connection
- Review migration SQL file for errors
- Try manual SQL execution if Prisma migrate fails
