# Twilio Failover Setup (Per Owner + Global)

Last updated: 2026-03-06

## Goal

Ensure inbound calls never hit silence when AI is unavailable.

## How failover works in this codebase

Priority order for fallback routing:

1. Per-agent `backupPhoneNumber`
2. Per-agent `transferPhone`
3. Global env `TWILIO_FAILOVER_NUMBER`
4. Global env `CLINIC_FAILOVER_NUMBER`
5. If no number is available: voicemail recording fallback

Runtime endpoints:

- Primary voice webhook: `/api/twilio/voice-callback`
- Fallback voice webhook: `/api/twilio/voice-fallback`

## Per-owner configuration (recommended)

For each owner/clinic, set each voice agent with:

- `backupPhoneNumber` (best)
- `transferPhone` (secondary)

These are stored on the `VoiceAgent` record and used automatically at runtime.

## Global configuration (safety net)

Set one or both env vars in deployment settings:

- `TWILIO_FAILOVER_NUMBER`
- `CLINIC_FAILOVER_NUMBER`

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

## Validation checklist

1. Disable/invalid the agent's ElevenLabs ID for a test agent.
2. Call the Twilio number.
3. Confirm call is forwarded to clinic backup number.
4. Remove per-agent fallback and confirm global fallback is used.
5. Remove global fallback and confirm voicemail recording path executes.
