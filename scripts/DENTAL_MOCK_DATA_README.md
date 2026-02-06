# Dental Mock Data Scripts

This directory contains scripts to create and delete comprehensive mock data for testing all dental management features.

## 📋 Overview

The mock data includes:
- **5 Mock Patients** with complete dental profiles
- **Odontogram data** (tooth charts with conditions)
- **Periodontal charts** (pocket depths, BOP, recession, mobility)
- **Treatment plans** (with procedures and costs)
- **Procedures** (activity log with CDT codes)
- **Forms and form responses** (with digital signatures)
- **X-ray records** (with mock image URLs and AI analysis)
- **Documents** (Law 25 compliant document storage)
- **RAMQ claims** (insurance claims stored in Lead.insuranceInfo)

All mock data is tagged with `MOCK_DATA` tag for easy identification and deletion.

## 🚀 Usage

### Create Mock Data

```bash
npx tsx scripts/create-dental-mock-data.ts
```

This script will:
1. Find or use the orthodontist user (`orthodontist@nexrel.com`)
2. Create 5 mock patients with dental-specific data
3. Generate comprehensive dental records for each patient
4. Tag all data with `MOCK_DATA` tag

**Note:** If the orthodontist user doesn't exist, run `npx tsx scripts/create-orthodontist-admin.ts` first.

### Delete Mock Data

```bash
npx tsx scripts/delete-dental-mock-data.ts
```

This script will:
1. Find all leads tagged with `MOCK_DATA` or with `source='mock_data'`
2. Delete all associated dental records (odontogram, periodontal, treatment plans, procedures, forms, xrays, documents)
3. Delete the mock patients themselves

**⚠️ WARNING:** This permanently deletes all mock data!

## 📊 Mock Data Details

### Patients Created

1. **Jean Dupont** - Regular patient with RAMQ insurance
2. **Marie Tremblay** - New patient needing orthodontic consultation
3. **Pierre Gagnon** - Diabetic patient requiring special care
4. **Sophie Martin** - Teenage patient, braces candidate
5. **Luc Lavoie** - Regular cleanings, good oral health

### Data Per Patient

- **Odontogram:** 1 chart with random tooth conditions
- **Periodontal Chart:** 1 chart with measurements for multiple teeth
- **Treatment Plans:** 1-2 plans with 2-6 procedures each
- **Procedures:** 3-7 procedures with various statuses
- **X-rays:** 2-4 X-rays with mock image URLs
- **Documents:** 2-4 documents (consent forms, insurance, reports)
- **RAMQ Claims:** 1-3 claims (for RAMQ-insured patients)

### Forms Created

- **Mock Form 1 - Medical History**
- **Mock Form 2 - Consent**
- **Mock Form 3 - Treatment**
- **Mock Form 4 - Insurance**

Each patient has at least one form response with a digital signature.

## 🔍 Identifying Mock Data

All mock data can be identified by:

1. **Lead tags:** Contains `MOCK_DATA` tag
2. **Lead source:** Set to `'mock_data'`
3. **Notes/Descriptions:** Contains `"Mock ... - MOCK_DATA"` text
4. **Metadata:** JSON fields contain `tags: ["MOCK_DATA"]`

## 🧪 Testing Features

After creating mock data, you can test:

- ✅ **Odontogram Tab** - View and edit tooth charts
- ✅ **Periodontal Tab** - View periodontal measurements
- ✅ **Treatment Plan Tab** - View treatment plans with procedures
- ✅ **Procedures Tab** - View procedure activity log
- ✅ **Forms Builder Tab** - View form templates
- ✅ **Fill Form Tab** - Fill out forms for patients
- ✅ **Responses Tab** - View form submissions
- ✅ **Generate Doc Tab** - Generate documents
- ✅ **Documents Tab** - View uploaded documents
- ✅ **RAMQ Tab** - View and manage RAMQ claims
- ✅ **Signature Tab** - View electronic signatures
- ✅ **X-Ray Tab** - View X-rays with AI analysis

## 🔧 Troubleshooting

### Script fails to find orthodontist user

**Solution:** Run `npx tsx scripts/create-orthodontist-admin.ts` first to create the user.

### Mock data not appearing

**Solution:** 
1. Check that the script completed successfully
2. Verify you're logged in as the orthodontist user
3. Refresh the dental management page
4. Select a patient from the dropdown

### Cannot delete mock data

**Solution:**
1. Ensure you're running the delete script with proper database access
2. Check that leads have `source='mock_data'` or tags contain `MOCK_DATA`
3. Verify database connection is working

## 📝 Notes

- Mock X-ray images use placeholder URLs (`via.placeholder.com`)
- In production, these would be real S3 URLs pointing to actual DICOM files
- RAMQ claims are stored in `Lead.insuranceInfo.ramqClaims` JSON array
- All dates are randomized within the past year
- Costs and coverage percentages are realistic but randomized

## 🗑️ Cleanup

To remove all mock data:

```bash
npx tsx scripts/delete-dental-mock-data.ts
```

This will delete:
- All mock patients (leads)
- All associated dental records
- All mock forms and responses
- All mock documents

**Note:** This operation cannot be undone. Make sure you want to delete all mock data before running.
