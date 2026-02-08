# Multi-Clinic Support Implementation

## Overview
Multi-clinic support allows dental practices to manage multiple clinic locations from a single account, with centralized administration and clinic-specific data isolation.

## Database Schema

### Clinic Model
- Basic info: name, address, contact details
- Settings: timezone, currency, language
- Branding: logo, primary color
- Status: isActive flag

### UserClinic Junction Table
- Many-to-many relationship between Users and Clinics
- Roles: OWNER, ADMIN, MEMBER
- isPrimary flag for user's default clinic

### Clinic ID Added To:
- DentalOdontogram
- DentalPeriodontalChart
- DentalTreatmentPlan
- DentalProcedure
- DentalForm
- DentalFormResponse
- DentalXRay
- DentalLabOrder
- DentalInsuranceClaim
- VnaConfiguration
- PatientDocument

## API Endpoints

### GET /api/clinics
- List all clinics for current user
- Returns clinics with role and isPrimary flag

### POST /api/clinics
- Create new clinic
- Automatically adds creator as OWNER with isPrimary=true

### GET /api/clinics/[id]
- Get clinic details
- Verifies user access

### PATCH /api/clinics/[id]
- Update clinic (OWNER/ADMIN only)

### POST /api/clinics/switch
- Switch active clinic context

## UI Components

### ClinicSelector
- Dropdown to switch between clinics
- Shows clinic name and "Primary" badge
- Located in dashboard header

### ClinicProvider (Context)
- Provides active clinic context
- Persists selection in localStorage
- Auto-selects primary clinic on load

## Migration Notes

The migration automatically:
1. Creates default clinic for each existing DENTIST user
2. Migrates all existing dental data to user's clinic
3. Creates UserClinic relationships

## Next Steps

1. Add clinic filtering to all dental queries
2. Implement cross-clinic permissions
3. Create centralized admin dashboard
4. Add clinic creation/edit UI
5. Add clinic settings page
