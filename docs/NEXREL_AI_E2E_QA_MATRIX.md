# Nexrel AI Master Conductor QA Matrix

## Automated Checks Completed

- `npm run -s typecheck`
- `npx vitest run tests/unit/openclaw-voice.test.ts`

## Surface Coverage Checklist

- Assistant action gateway preflight: implemented
- Workflow execution preflight: implemented
- Campaign execution/send preflight: implemented
- Scheduled email/SMS preflight: implemented
- Website webhook trigger preflight: implemented
- Deal creation trigger preflight: implemented
- Review intelligence trigger preflight: implemented
- Campaign trigger enrollment preflight: implemented
- AI assistant confirm email/SMS preflight: implemented
- Lead creation preflight: implemented
- Messaging service preflight: implemented

## Required Production-like Validation (Manual)

- Credentials/integration validation:
  - Twilio send and callback paths
  - SMTP/sendgrid provider behavior
  - NanoBanana generation endpoint
  - Gemini Pro generation endpoint
- Tenant control validation:
  - Pause/Stop/Resume while jobs are active
  - Module/channel toggles enforce as expected
  - Daily caps + windows enforcement under load
- Approval flow validation:
  - High-risk action pending -> approve -> executes
  - High-risk action pending -> reject -> blocks
- Cron validation:
  - `agent-command-center-cycle`
  - `nexrel-ai-brain-mandates`
  - `nexrel-ai-brain-learning-snapshot`

## Suggested Smoke Script Order

1. Set `NEXREL_AI_BRAIN_SHADOW_ORCHESTRATION=true` and keep enforce off.
2. Run representative actions from assistant + workflow + campaigns + scheduled dispatch.
3. Confirm audit entries for `NEXREL_AI_BRAIN_DECISION` and `NEXREL_AI_BRAIN_OUTCOME`.
4. Enable enforce mode for one tenant and re-run.
5. Validate blocked actions return controlled 409 responses.
