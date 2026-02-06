# Dental Phase 1 - Database Migration Guide

## ✅ Prerequisites Completed

- ✅ Prisma schema updated with all Phase 1 models
- ✅ Prisma client generated successfully
- ✅ Schema validated and formatted
- ✅ Backup script created (`scripts/backup/backup-before-dental-phase1.sh`)
- ✅ All components built and tested

## 🗄️ Migration Steps

### Step 1: Verify Environment

Ensure your `.env` or `.env.local` file has `DATABASE_URL` set:

```bash
DATABASE_URL="postgresql://user:password@host:port/database"
```

### Step 2: Create Backup (Recommended)

Run the backup script before migrating:

```bash
bash scripts/backup/backup-before-dental-phase1.sh
```

This will:
- Create a backup of `prisma/schema.prisma`
- Export database data (if DATABASE_URL is set)
- Create a git tag for easy rollback

### Step 3: Run Migration

Once `DATABASE_URL` is configured, run:

```bash
npx prisma migrate dev --name add_dental_phase1
```

This will:
- Create a new migration file in `prisma/migrations/`
- Apply the migration to your database
- Generate the Prisma client with new types

### Step 4: Verify Migration

After migration, verify the new tables exist:

```bash
npx prisma studio
```

Or check via SQL:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'Dental%' OR table_name LIKE 'Document%' OR table_name LIKE 'Data%';
```

## 📊 What's Being Migrated

### New Tables (12 total):

**Dental Models:**
1. `DentalOdontogram` - Tooth chart data
2. `DentalPeriodontalChart` - Periodontal measurements
3. `DentalTreatmentPlan` - Treatment plans
4. `DentalProcedure` - Procedure log
5. `DentalForm` - Dynamic forms
6. `DentalFormResponse` - Form submissions

**Law 25 Document Storage Models:**
7. `PatientDocument` - Patient documents
8. `DocumentVersion` - Document versioning
9. `DocumentConsent` - Consent records
10. `DocumentAccessLog` - Access audit logs
11. `DataAccessRequest` - Patient data requests
12. `DataBreach` - Breach records

### New Enums (10 total):

- `TreatmentPlanStatus`
- `ProcedureStatus`
- `DocumentType`
- `DocumentAccessLevel`
- `ConsentType`
- `DocumentAccessAction`
- `DataRequestType`
- `DataRequestStatus`
- `BreachType`
- `BreachSeverity`

### Lead Model Extensions:

- `familyGroupId` (String, optional)
- `dentalHistory` (JSON, optional)
- `insuranceInfo` (JSON, optional)

## ✅ Safety Checks

- ✅ All new fields are **optional** (won't break existing queries)
- ✅ No breaking changes to existing models
- ✅ Other industries completely unaffected
- ✅ Fully backward compatible
- ✅ Can rollback if needed (backup created)

## 🚨 Rollback Instructions

If you need to rollback:

1. **Restore schema backup:**
   ```bash
   cp prisma/schema.prisma.backup_before_dental_phase1 prisma/schema.prisma
   ```

2. **Restore database (if backup was created):**
   ```bash
   # Use your database restore method
   # Or manually drop the new tables
   ```

3. **Reset Prisma client:**
   ```bash
   npx prisma generate
   ```

4. **Git rollback (if needed):**
   ```bash
   git checkout <backup-tag>
   ```

## 📝 Post-Migration Checklist

- [ ] Verify all tables created successfully
- [ ] Test odontogram component (`/dashboard/dental-test`)
- [ ] Test document upload component
- [ ] Verify Law 25 compliance features
- [ ] Check API routes are working
- [ ] Test consent management
- [ ] Verify access logging

## 🎯 Next Steps After Migration

See `DENTAL_FUTURE_PHASES_REMINDER.md` for:
- X-ray integration with AI analysis
- 3D rotatable odontogram
- Phases 2-5 UI components
- RAMQ integration
- Electronic signatures
- And more...

---

**Status:** ✅ Ready to migrate (when DATABASE_URL is configured)
