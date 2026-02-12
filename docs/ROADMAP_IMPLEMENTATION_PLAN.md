# Roadmap Implementation Plan

## Phase 1: Polish & UX ✅
- [x] Smart replies – context-aware (deals, notes, tasks)
- [x] Email sync – auto-create Leads for unknown addresses
- [x] Summarize – add to lead detail & Voice Agents
- [x] Sync button – targeted refresh instead of reload

## Phase 2: Outlook / Microsoft 365 Sync ✅
- [x] OAuth for Microsoft 365 (`/api/messaging/connections/outlook/auth`, callback)
- [x] Outlook sync service (`lib/messaging-sync/outlook-service.ts`)
- [x] Lead linking by email (same as Gmail)
- [x] Email dialog: Gmail | Outlook | Custom SMTP

## Phase 3: DICOM + CRM Integration ✅
- [x] DentalXRay has leadId – `LeadImagingSection` shows in lead detail
- [x] Imaging section in lead views (fetches `/api/dental/xrays?leadId=`)
- [ ] Link studies to appointments (schema: optional `appointmentId` on DentalXRay)

## Phase 4: Testing & Reliability ✅
- [x] Tests: smart-replies, calls-summarize
- [x] Sync logging (`lib/messaging-sync/sync-logger.ts`, `SYNC_LOG_LEVEL` env)
- [ ] Sentry: `npm i @sentry/nextjs` + `npx @sentry/wizard@latest -i nextjs`

## Phase 5: Admin & Analytics ✅
- [x] Sync health API (`/api/admin/sync-health`)
- [ ] Sync health dashboard UI
- [ ] AI usage stats + channel reports

## Phase 6: Marketing / Growth
- [ ] SEO: blog + landing meta, sitemap
- [ ] Website builder analytics
- [ ] A/B tests for lead capture

## Environment Variables

**Outlook:**
- `MICROSOFT_CLIENT_ID` or `AZURE_CLIENT_ID`
- `MICROSOFT_CLIENT_SECRET` or `AZURE_CLIENT_SECRET`

**Sync logging:**
- `SYNC_LOG_LEVEL`=debug|info|warn|error (default: info)
