# Multi-Clinic Support Implementation Plan

## Overview
Add multi-clinic support to enable dental practices to manage multiple clinic locations from a single account.

## Phase 1: Database Schema ✅ (In Progress)

### Models Added:
1. **Clinic** - Main clinic entity
   - Basic info (name, address, contact)
   - Settings (timezone, currency, language)
   - Branding (logo, primaryColor)
   - Status (isActive)

2. **UserClinic** - Junction table for many-to-many relationship
   - Links users to clinics
   - Role-based access (OWNER, ADMIN, MEMBER)
   - Primary clinic flag

### Models Updated (clinicId added):
- DentalOdontogram ✅
- DentalPeriodontalChart ✅
- DentalTreatmentPlan ✅
- DentalProcedure (pending)
- DentalForm (pending)
- DentalFormResponse (pending)
- DentalXRay (pending)
- DentalLabOrder (pending)
- DentalInsuranceClaim (pending)
- VnaConfiguration (pending)
- PatientDocument (pending)

## Phase 2: API Updates (Next)

### Endpoints to Create:
- `GET /api/clinics` - List user's clinics
- `POST /api/clinics` - Create new clinic
- `GET /api/clinics/[id]` - Get clinic details
- `PUT /api/clinics/[id]` - Update clinic
- `DELETE /api/clinics/[id]` - Delete clinic
- `POST /api/clinics/[id]/members` - Add user to clinic
- `DELETE /api/clinics/[id]/members/[userId]` - Remove user
- `PUT /api/clinics/[id]/members/[userId]` - Update user role
- `GET /api/clinics/[id]/switch` - Switch active clinic

### Middleware:
- Add `clinicId` to session/context
- Filter queries by `clinicId`
- Validate clinic access permissions

## Phase 3: UI Components (Next)

### Components to Create:
1. **ClinicSelector** - Dropdown/switcher in header
2. **ClinicManagement** - Admin page for managing clinics
3. **ClinicSettings** - Settings page per clinic
4. **ClinicMembers** - Manage team members per clinic

### Pages to Update:
- All dental dashboard pages (add clinic context)
- All API routes (add clinic filtering)

## Phase 4: Advanced Reporting (After Multi-Clinic)

### Reports to Build:
1. **Financial Reports**
   - P&L by clinic
   - Collections by clinic
   - Procedure profitability
   - Insurance aging

2. **Production Reports**
   - Production by provider
   - Production by clinic
   - Procedure volume
   - Revenue trends

3. **Custom Report Builder**
   - Drag-and-drop fields
   - Date ranges
   - Filters
   - Export (PDF, Excel, CSV)

## Phase 5: Patient Portal (Last)

### Features:
- Appointment history
- Treatment plan viewing
- Bill pay
- Secure messaging
- Document access
- Online appointment booking

## Migration Strategy

1. **Backward Compatibility**: Keep `userId` for existing data
2. **Default Clinic**: Auto-create clinic for existing users
3. **Gradual Migration**: Allow clinicId to be nullable initially
4. **Data Migration**: Script to assign clinicId based on userId

## Testing Checklist

- [ ] Create multiple clinics
- [ ] Switch between clinics
- [ ] Verify data isolation
- [ ] Test permissions (OWNER, ADMIN, MEMBER)
- [ ] Test cross-clinic reporting
- [ ] Verify existing data still works
