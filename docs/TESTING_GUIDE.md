# Testing Guide: VNA Configuration & Workflow Actions

## Prerequisites

1. ✅ Database migration completed
2. ✅ Prisma Client generated (`npx prisma generate`)
3. ✅ Development server running (`npm run dev`)

## Part 1: Create VNA Configurations

### Step 1: Access VNA Configuration UI

1. Log in to your orthodontist account
2. Navigate to **Administrative Dashboard** (`/dashboard/dental/admin`)
3. Scroll down to **VNA Configuration** section
4. Click **"Configure VNAs"** button

### Step 2: Create Test VNA Configurations

#### Test Case 1: Orthanc VNA
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
   - ✅ **Set as default VNA**
3. Click **"Create VNA"**
4. Click **"Test"** button to verify connection
5. ✅ Verify: Status shows "success" with green checkmark

#### Test Case 2: AWS S3 VNA
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

#### Test Case 3: Cloud VNA (Dentitek)
1. Click **"Add VNA"**
2. Fill in:
   - **Name**: `Dentitek Cloud VNA`
   - **Type**: `Cloud VNA (Dentitek, etc.)`
   - **Endpoint URL**: `https://api.dentitek.com`
   - **Priority**: `2`
3. Click **"Create VNA"**
4. ✅ Verify: VNA appears in list

### Expected Results
- ✅ All three VNAs appear in the list
- ✅ Default VNA is marked with "Default" badge
- ✅ Connection test for Orthanc shows success/failure status
- ✅ Can edit and delete VNAs

## Part 2: Test Routing Rules

### Step 1: Create Routing Rules

1. In the VNA Configuration modal, scroll to **"Routing Rules"** section
2. Click **"Add Rule"**

#### Rule 1: Route CBCT to Cloud VNA
- **Rule Name**: `Route CBCT to Cloud`
- **Priority**: `0`
- **Conditions**:
  - **Image Type**: Select `CBCT`
- **Action**:
  - **Route to VNA**: `Dentitek Cloud VNA`
  - ✅ **Compress before routing**
- Click **"Create Rule"**

#### Rule 2: Route by Location
- **Rule Name**: `Main Clinic Route`
- **Priority**: `1`
- **Conditions**:
  - **Location**: `Main Clinic`
- **Action**:
  - **Route to VNA**: `Local Orthanc Server`
- Click **"Create Rule"**

#### Rule 3: Default Route
- Ensure one VNA is set as **Default** (already done)
- This will catch all images that don't match other rules

### Step 2: Verify Rule Ordering

- ✅ Rules should be displayed in priority order (0, 1, 2...)
- ✅ Lower number = higher priority (evaluated first)

### Expected Results
- ✅ Rules appear in correct priority order
- ✅ Can edit and delete rules
- ✅ Rules show conditions and actions clearly

## Part 3: Verify Workflow Actions Execute Correctly

### Step 1: Test Workflow Trigger

1. Navigate to **Clinical Dashboard** (`/dashboard/dental/clinical`)
2. Upload a test X-ray:
   - Select a patient
   - Click **"X-Ray Analysis"** card
   - Upload a test DICOM file
3. ✅ Verify: X-ray upload triggers `XRAY_UPLOADED` workflow

### Step 2: Create Test Workflow

1. Navigate to **AI Employee** page
2. Go to **Workflow Builder**
3. Create a new workflow:

**Workflow Name**: `Test Dental Workflow`

**Trigger**: `XRAY_UPLOADED`

**Actions**:
1. `SEND_TREATMENT_UPDATE_TO_PATIENT` (delay: 0 minutes)
2. `CREATE_CLINICAL_NOTE` (delay: 5 minutes)
3. `SCHEDULE_FOLLOWUP_APPOINTMENT` (delay: 1440 minutes / 1 day)

4. Save workflow
5. Activate workflow

### Step 3: Test Workflow Execution

1. Upload a new X-ray (triggers the workflow)
2. Check workflow execution:
   - Navigate to workflow instances/logs
   - ✅ Verify: Actions execute in order
   - ✅ Verify: Delays are respected
   - ✅ Verify: Patient receives email/SMS
   - ✅ Verify: Clinical note is created
   - ✅ Verify: Follow-up appointment is scheduled

### Step 4: Test Admin Workflow Actions

Create another workflow:

**Workflow Name**: `Appointment Reminder Workflow`

**Trigger**: `APPOINTMENT_SCHEDULED`

**Actions**:
1. `SEND_APPOINTMENT_REMINDER` (delay: 10080 minutes / 1 week)
2. `SEND_APPOINTMENT_REMINDER` (delay: 1440 minutes / 1 day)

Test by:
1. Creating a new appointment
2. ✅ Verify: Reminders are scheduled correctly

### Step 5: Test All Action Types

Create test workflows for each action type:

#### Clinical Actions
- ✅ `CREATE_TREATMENT_PLAN` - Creates treatment plan
- ✅ `UPDATE_ODONTOGRAM` - Updates odontogram
- ✅ `SCHEDULE_FOLLOWUP_APPOINTMENT` - Creates appointment
- ✅ `SEND_TREATMENT_UPDATE_TO_PATIENT` - Sends email/SMS
- ✅ `CREATE_CLINICAL_NOTE` - Creates note
- ✅ `REQUEST_XRAY_REVIEW` - Creates task
- ✅ `GENERATE_TREATMENT_REPORT` - Generates report
- ✅ `UPDATE_TREATMENT_PLAN` - Updates plan
- ✅ `LOG_PROCEDURE` - Logs procedure

#### Admin Actions
- ✅ `SEND_APPOINTMENT_REMINDER` - Sends reminder
- ✅ `PROCESS_PAYMENT` - Processes payment
- ✅ `SUBMIT_INSURANCE_CLAIM` - Submits claim
- ✅ `GENERATE_INVOICE` - Generates invoice
- ✅ `UPDATE_PATIENT_INFO` - Updates patient
- ✅ `CREATE_LAB_ORDER` - Creates lab order
- ✅ `GENERATE_PRODUCTION_REPORT` - Generates report
- ✅ `NOTIFY_TEAM_MEMBER` - Notifies team
- ✅ `RESCHEDULE_APPOINTMENT` - Reschedules appointment
- ✅ `SEND_BILLING_REMINDER` - Sends billing reminder
- ✅ `UPDATE_APPOINTMENT_STATUS` - Updates status

## Part 4: Verify VNA Routing Integration

### Step 1: Upload X-ray with Routing

1. Upload a CBCT X-ray
2. ✅ Verify: Image is routed to "Dentitek Cloud VNA" (based on Rule 1)
3. Check VNA logs/storage to confirm image was received

### Step 2: Test Default Routing

1. Upload a regular X-ray (not CBCT, no location match)
2. ✅ Verify: Image is routed to default VNA (Local Orthanc Server)

### Step 3: Test Location-Based Routing

1. Set patient location to "Main Clinic"
2. Upload X-ray
3. ✅ Verify: Image is routed to "Local Orthanc Server" (based on Rule 2)

## Troubleshooting

### VNA Connection Fails
- Check if Orthanc is running: `docker ps | grep orthanc`
- Verify credentials are correct
- Check network connectivity

### Workflow Actions Not Executing
- Check workflow is ACTIVE
- Verify trigger conditions are met
- Check workflow execution logs
- Verify Prisma Client is up to date

### Routing Rules Not Working
- Verify VNA configurations are active
- Check rule priority order
- Ensure default VNA is set
- Check X-ray upload logs for routing decisions

## Success Criteria

✅ All VNA configurations can be created, edited, and deleted
✅ Routing rules work correctly based on conditions
✅ Workflow actions execute successfully
✅ X-rays are routed to correct VNA based on rules
✅ Workflow triggers fire correctly
✅ All action types function as expected
