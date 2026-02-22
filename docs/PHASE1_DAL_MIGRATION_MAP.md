# Phase 1 DAL Migration Map

**Goal:** No direct `prisma.lead`, `prisma.deal`, `prisma.campaign`, `prisma.website`, `prisma.task`, `prisma.conversation`, `prisma.workflowTemplate` in API routes, pages, or lib files. All go through DAL.

## DAL Services Available

| Service | Methods |
|---------|---------|
| leadService | findMany, findUnique, create, update, delete, count |
| dealService | findMany, findUnique, create, update, delete, count |
| campaignService | findMany, findUnique, create, update, delete, count |
| websiteService | findMany, findUnique, findFirst, create, update, delete, count |
| taskService | findMany, findUnique, create, update, delete, count |
| conversationService | findMany, findUnique, findFirst, create, update, delete, count |
| workflowTemplateService | findMany, findUnique, findFirst, create, update, delete, count |
| noteService | findMany, create, findFirst, update, delete |
| messageService | findMany, create, findFirst, update |

## Context Helpers

- `getDalContextFromSession(session)` - from API routes/pages with session
- `createDalContext(userId, industry?)` - from libs/jobs with userId

## Migration Status

### API Routes (Phase 1 Complete)
- [x] app/api/leads/*, contacts/*, deals/*, campaigns/*, websites/*, workflows/*
- [x] app/api/ai-assistant/*, crm-voice-agent/*, messaging/*, messages/*
- [x] app/api/instagram/*, facebook/*, twilio/*, webhooks/*
- [x] app/api/admin/*, lead-generation/*, reviews/*, smart-replies/*
- [x] app/api/landing-admin/*, real-estate/*, docpen/*, ehr-bridge/*
- [x] app/api/calls/*, conversations/*, appointments/*, pricing-gate/*
- [x] app/api/website-builder/*, cron/*, business-ai/*

### Dashboard Pages
- [x] app/dashboard/leads/page.tsx
- [x] app/dashboard/leads/[id]/page.tsx
- [x] app/dashboard/page.tsx
- [x] app/dashboard/messages/generate/page.tsx

### Lib Files (Phase 1 Complete)
- [x] lib/dal/*, lib/website-builder/*, lib/workflows/*, lib/industry-workflows/*
- [x] lib/ai-brain*, lib/ai-employees/*, lib/lead-generation/*, lib/messaging-sync/*
- [x] lib/integrations/*, lib/referral-triggers*, lib/website-triggers*

## Exclusions (Stay on prisma)

- **Auth/Meta:** User, Session, Account, Agency - stay on prisma (Meta DB in Phase 2)
- **Scripts:** scripts/* - can stay on prisma (one-off, not request-scoped)
- **Tests:** tests/* - can stay on prisma or mock DAL
- **Backups:** backups/* - ignore
