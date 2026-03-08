# Twilio Failover Setup (Per Owner + Global)

Last updated: 2026-03-06

## Goal

Ensure inbound calls never hit silence when AI is unavailable.

## How failover works in this codebase

Priority order for fallback routing:

1. Per-agent `backupPhoneNumber`
2. Per-agent `transferPhone`
3. Owner/company phone from profile (`User.phone`) when agent-specific numbers are not set
4. Industry-specific global failover env (if configured)
5. Global env `TWILIO_FAILOVER_NUMBER`
6. Legacy/global env `CLINIC_FAILOVER_NUMBER`
7. If no number is available: voicemail recording fallback

Runtime endpoints:

- Primary voice webhook: `/api/twilio/voice-callback`
- Fallback voice webhook: `/api/twilio/voice-fallback`

## Per-owner configuration (recommended)

For each owner/clinic, set each voice agent with:

- `backupPhoneNumber` (best)
- `transferPhone` (secondary)

These are stored on the `VoiceAgent` record and used automatically at runtime.

### Auto-default from onboarding/company profile

When a new voice agent is created without explicit fallback numbers, the system now auto-defaults:

- `transferPhone` = owner/company phone (`User.phone`)
- `backupPhoneNumber` = owner/company phone (`User.phone`)

So each owner's agents inherit that owner's company phone as the default fallback unless overridden.

## Global configuration (safety net)

Set one or both env vars in deployment settings:

- `TWILIO_FAILOVER_NUMBER`
- `CLINIC_FAILOVER_NUMBER`

Optional industry-specific global fallbacks can be set using any of these patterns:

- `TWILIO_<INDUSTRY>_FAILOVER_NUMBER`
- `TWILIO_FAILOVER_NUMBER_<INDUSTRY>`
- `<INDUSTRY>_FAILOVER_NUMBER`
- `FAILOVER_NUMBER_<INDUSTRY>`

Examples:

- `TWILIO_DENTIST_FAILOVER_NUMBER`
- `TWILIO_REAL_ESTATE_FAILOVER_NUMBER`
- `HOSPITAL_FAILOVER_NUMBER`

These apply deployment-wide as a default when per-agent values are missing.

## Twilio Console setup

For every Twilio phone number used by a clinic:

1. Open Twilio Console → Phone Numbers → Active numbers.
2. Select the number.
3. Set **A CALL COMES IN** webhook URL to:
   - `https://<your-domain>/api/twilio/voice-callback`
4. Set **Fallback URL** (voice) to:
   - `https://<your-domain>/api/twilio/voice-fallback`
5. Save and test with a live call.

### Auto-configuration note

New phone numbers purchased through `/api/twilio/phone-numbers/purchase` are provisioned with:

- Voice URL: `/api/twilio/voice-callback`
- Voice Fallback URL: `/api/twilio/voice-fallback`

Existing numbers and numbers provisioned outside this API still require manual verification in Twilio Console.

## Validation checklist

1. Disable/invalid the agent's ElevenLabs ID for a test agent.
2. Call the Twilio number.
3. Confirm call is forwarded to clinic backup number.
4. Remove per-agent fallback and confirm global fallback is used.
5. Remove global fallback and confirm voicemail recording path executes.
