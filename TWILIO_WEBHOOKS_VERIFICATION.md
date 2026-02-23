# Twilio Webhooks Verification Report

## Summary (UPDATED – Industry routing applied)

All Twilio voice-related webhooks now use industry-aware DB routing via `resolveVoiceAgentByPhone`, `resolveCallLogBySid`, and `resolveCallLogByConversationId` from `@/lib/dal`. CallLogs and VoiceAgents are resolved across default + industry DBs.

For users with industry DB routing (e.g. Theodora with REAL_ESTATE + `DATABASE_URL_REAL_ESTATE`):
- **Leads** → industry DB (via leadService)
- **Deals/Pipelines** → industry DB (after our fix)
- **VoiceAgents** → default DB (voice-agents API uses prisma)
- **CallLogs** → default DB (Twilio webhooks use prisma)

---

## Webhook Endpoints Verified

### 1. `/api/twilio/voice-callback` (Primary – ElevenLabs WebSocket)
**File:** `app/api/twilio/voice-callback/route.ts`

| Operation | DB Used | Notes |
|-----------|---------|-------|
| Find VoiceAgent | `prisma` | `prisma.voiceAgent.findFirst({ twilioPhoneNumber: to })` |
| INBOUND call – Create CallLog | `getCrmDb` | Via `enhancedCallHandler.handleIncomingCall()` – uses `getCrmDb(createDalContext(userId))` but userId alone gives industry: null → falls back to prisma |
| OUTBOUND call – Create CallLog | `prisma` | Direct `prisma.callLog.create()` |

**Issue:** VoiceAgent lookup uses prisma. If VoiceAgents are in industry DB, they won't be found.

---

### 2. `/api/twilio/call-status` (Status Callback)
**File:** `app/api/twilio/call-status/route.ts`

| Operation | DB Used | Notes |
|-----------|---------|-------|
| Find CallLog by SID | `prisma` | `prisma.callLog.findFirst()` |
| Find VoiceAgent | `prisma` | `prisma.voiceAgent.findFirst({ twilioPhoneNumber: to })` |
| Create CallLog | `prisma` | When no log exists (Native Integration path) |
| Update CallLog | `prisma` | Status, duration, etc. |
| Update OutboundCall | `prisma` | `prisma.outboundCall.updateMany()` |
| fetchAndProcessElevenLabsData | `prisma` | All CallLog/VoiceAgent reads and updates |
| sendEmailNotification | `prisma` | VoiceAgent + CallLog lookups |

**Issue:** All operations use default DB. CallLogs created here will not appear for industry users when `/api/calls` uses getCrmDb.

---

### 3. `/api/twilio/voice-webhook` (Legacy Speech-Based Flow)
**File:** `app/api/twilio/voice-webhook/route.ts`

| Operation | DB Used | Notes |
|-----------|---------|-------|
| Find VoiceAgent | `prisma` | `prisma.voiceAgent.findFirst()` |
| Find/Create CallLog | `prisma` | `prisma.callLog.findFirst` + `prisma.callLog.create` |
| Update CallLog | `prisma` | Multiple updates |
| Create BookingAppointment | `prisma` | `prisma.bookingAppointment.create` |

**Issue:** All prisma. Used for older speech-based flow (not ElevenLabs WebSocket).

---

### 4. `/api/webhooks/elevenlabs/post-call` (ElevenLabs Post-Call)
**File:** `app/api/webhooks/elevenlabs/post-call/route.ts`

| Operation | DB Used | Notes |
|-----------|---------|-------|
| Find CallLog | `prisma` | By elevenLabsConversationId or twilioCallSid |
| Find VoiceAgent | `prisma` | `prisma.voiceAgent.findFirst({ twilioPhoneNumber })` |
| Create CallLog | `prisma` | When no existing log |

**Issue:** All prisma.

---

### 5. `enhancedCallHandler.handleIncomingCall` (Used by voice-callback)
**File:** `lib/integrations/enhanced-call-handler.ts`

| Operation | DB Used | Notes |
|-----------|---------|-------|
| Create CallLog | `getCrmDb(createDalContext(userId))` | Uses `createDalContext(userId)` – **industry is not passed**, so industry is null → getCrmDb returns prisma |

**Issue:** Effectively uses default DB because industry is not resolved from userId.

---

## Recommended Fix for Industry DB Consistency

To make CallLogs appear for industry users (e.g. Theodora):

1. **Resolve industry from userId** in webhooks:
   ```ts
   const user = await prisma.user.findUnique({ where: { id: voiceAgent.userId }, select: { industry: true } });
   const ctx = createDalContext(voiceAgent.userId, user?.industry);
   const db = getCrmDb(ctx);
   ```

2. **Update these files to use `db` instead of `prisma`** for CallLog/VoiceAgent:
   - `app/api/twilio/voice-callback/route.ts` – VoiceAgent lookup + CallLog create (OUTBOUND path)
   - `app/api/twilio/call-status/route.ts` – All CallLog/VoiceAgent/OutboundCall operations
   - `app/api/twilio/voice-webhook/route.ts` – All operations
   - `app/api/webhooks/elevenlabs/post-call/route.ts` – All CallLog/VoiceAgent operations

3. **VoiceAgent lookup** – If VoiceAgents are stored in the industry DB, the voice-agents API must also use getCrmDb. Currently it uses prisma.

---

## Current Configuration

- **Twilio Voice Configuration**: Set in Twilio Console per phone number
  - `A CALL COMES IN` → `https://your-domain.com/api/twilio/voice-callback` (or voice-webhook)
  - `STATUS CALLBACK URL` → `https://your-domain.com/api/twilio/call-status`

- **Environment**: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` must be set

---

## Next Steps

1. **If call history is missing for Theodora**: Apply the industry DB routing fix to the Twilio webhooks so new CallLogs are created in the correct DB.
2. **For existing CallLogs**: If they were created in the default DB, the `/api/calls` change to use getCrmDb would query the industry DB and find nothing. Consider either:
   - Reverting `/api/calls` to use prisma for now, OR
   - Migrating existing CallLogs from default DB to industry DB for Theodora, then applying the webhook fixes.
