# Clinical Test Data for Orthodontist Dashboard

All mock data is **strictly scoped to `orthodontist@nexrel.com`**. No test data is created for other users.

## Setup

1. **Download real 3D scan files** (run once):
   ```bash
   npx ts-node --skip-project scripts/download-dental-test-files.ts
   ```
   Downloads real STL files from GitHub:
   - `mandibular-3shape-real.stl` — Lower arch, 3Shape TRIOS scan (dentistfrankchen/dental-models)
   - `maxillary-3shape-real.stl` — Upper arch, 3Shape TRIOS scan
   - `tooth-1-molar.stl`, `tooth-14-molar.stl`, `tooth-19-molar.stl` — Individual teeth (MatthewMong/DentalImplants)

2. **Seed mock data**:
   ```bash
   npx ts-node --skip-project scripts/seed-clinical-test-data.ts
   ```
   Requires:
   - User `orthodontist@nexrel.com` exists
   - User has a clinic via `UserClinic` membership (no fallback to other users' clinics)
   - At least one lead (patient) owned by that user

## Data Isolation

- **User**: All records use `userId` from `orthodontist@nexrel.com`
- **Clinic**: Only clinics where orthodontist has `UserClinic` membership
- **Leads**: Only leads where `lead.userId === orthodontist.id`
- **No fallback**: If orthodontist has no clinic, the seed fails (no data created for other users)

## Manual Downloads (blocked for automation)

| Source | URL | Notes |
|--------|-----|-------|
| Printables | [Set of teeth - dental model](https://www.printables.com/model/83327-set-of-teeth-dental-model-3d-scan-test-with-raspi-) | Requires browser login; Cloudflare blocks curl |
| GrabCAD | [Dental teeth search](https://grabcad.com/library?query=dental+teeth) | Requires account; CloudFront blocks automation |
| DTU 3Shape | [3Shape FDI 16 Meshes](https://data.dtu.dk/articles/dataset/3Shape_FDI_16_Meshes_from_Intraoral_Scans/23626650) | 6.67 GB PLY files; registration may be required |

Place manually downloaded files in `public/test-assets/dental/3d-scans/`.
