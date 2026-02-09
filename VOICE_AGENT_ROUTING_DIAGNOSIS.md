# Voice Agent Routing Diagnosis & Fix Guide

## Problem
Twilio phone numbers are not routing to voice agents as they were before recent migrations.

## What We Checked

### ✅ Database Schema
- **VoiceAgent model**: No changes detected - all fields intact
- **Recent migrations**: Only added `crmVoiceAgentId` to User table (unrelated)
- **Fields checked**:
  - `twilioPhoneNumber` ✅
  - `elevenLabsAgentId` ✅
  - `elevenLabsPhoneNumberId` ✅
  - `status` ✅

### ✅ API Routes
- **`/api/twilio/voice-callback`**: No changes detected
- **`/api/twilio/call-status`**: No changes detected
- **`/api/twilio/voice-webhook`**: Still exists (legacy route)

### ✅ ElevenLabs Integration
- **Service**: `lib/elevenlabs.ts` - Uses `process.env.ELEVENLABS_API_KEY`
- **Methods**: `getSignedWebSocketUrl()`, `getAgent()` - No changes detected

## Most Likely Causes

### 1. **Environment Variable Missing** ⚠️ HIGH PRIORITY
After deployment, `ELEVENLABS_API_KEY` might not be set in Vercel environment variables.

**Check:**
```bash
# In Vercel Dashboard → Settings → Environment Variables
ELEVENLABS_API_KEY=sk_...
```

**Fix:**
1. Go to Vercel Dashboard
2. Settings → Environment Variables
3. Verify `ELEVENLABS_API_KEY` is set
4. Redeploy if needed

### 2. **Twilio Webhook URL Changed** ⚠️ HIGH PRIORITY
After deployment, your app URL might have changed, breaking webhook configuration.

**Check:**
1. Go to Twilio Console → Phone Numbers → Manage → Active Numbers
2. For each number, check "A CALL COMES IN" webhook URL
3. Verify it matches your current deployment URL

**Current webhook should be:**
```
https://YOUR_DOMAIN/api/twilio/voice-callback
```

**Fix:**
1. Update webhook URL in Twilio Console for each phone number
2. Set to: `https://YOUR_CURRENT_DOMAIN/api/twilio/voice-callback`
3. Method: POST

### 3. **Voice Agent Status** ⚠️ MEDIUM PRIORITY
Voice agents might have been set to inactive status.

**Check:**
```sql
SELECT id, name, status, "twilioPhoneNumber", "elevenLabsAgentId" 
FROM "VoiceAgent" 
WHERE "twilioPhoneNumber" IS NOT NULL;
```

**Fix:**
```sql
UPDATE "VoiceAgent" 
SET status = 'ACTIVE' 
WHERE "twilioPhoneNumber" IS NOT NULL AND status != 'ACTIVE';
```

### 4. **Phone Number Format Mismatch** ⚠️ MEDIUM PRIORITY
Database phone numbers might not match what Twilio sends (E.164 format).

**Check:**
```sql
SELECT id, name, "twilioPhoneNumber" 
FROM "VoiceAgent" 
WHERE "twilioPhoneNumber" IS NOT NULL 
  AND ("twilioPhoneNumber" NOT LIKE '+%' 
    OR "twilioPhoneNumber" LIKE '% %'
    OR "twilioPhoneNumber" LIKE '%-%');
```

**Fix:**
Phone numbers should be in E.164 format: `+1234567890` (no spaces, dashes, parentheses)

### 5. **Missing ElevenLabs Agent IDs** ⚠️ MEDIUM PRIORITY
Voice agents might be missing their ElevenLabs Agent IDs.

**Check:**
```sql
SELECT id, name, "twilioPhoneNumber", "elevenLabsAgentId" 
FROM "VoiceAgent" 
WHERE "twilioPhoneNumber" IS NOT NULL 
  AND "elevenLabsAgentId" IS NULL;
```

**Fix:**
Run auto-configuration for affected agents:
```bash
POST /api/voice-agents/{agentId}/auto-configure
```

## Diagnostic Steps

### Step 1: Run Diagnostic Script
```bash
npx tsx scripts/fix-voice-agent-routing.ts
```

This will:
- Check environment variables
- List all voice agents and their configuration
- Identify issues
- Suggest SQL fixes

### Step 2: Check Server Logs
When a call comes in, check your Vercel logs for:
```
📞 [Twilio Voice Callback] Received webhook
  📋 Call Details: { callSid, from, to, callStatus }
```

If you see:
- `❌ No voice agent found for number: +1234567890` → Phone number mismatch
- `❌ No ElevenLabs agent ID configured` → Agent missing ElevenLabs ID
- `❌ Failed to get WebSocket URL` → ElevenLabs API key issue

### Step 3: Verify Twilio Configuration
1. Log into Twilio Console
2. Go to Phone Numbers → Manage → Active Numbers
3. Click on each phone number
4. Verify:
   - **Voice Webhook**: `https://YOUR_DOMAIN/api/twilio/voice-callback` (POST)
   - **Status Callback**: `https://YOUR_DOMAIN/api/twilio/call-status` (POST)

### Step 4: Test ElevenLabs API
```bash
curl -X GET "https://api.elevenlabs.io/v1/user" \
  -H "xi-api-key: YOUR_ELEVENLABS_API_KEY"
```

Should return user subscription info. If it fails, API key is invalid.

## Quick Fix Checklist

- [ ] Verify `ELEVENLABS_API_KEY` is set in Vercel environment variables
- [ ] Update Twilio webhook URLs to match current deployment domain
- [ ] Set all voice agents with phone numbers to `ACTIVE` status
- [ ] Verify phone numbers are in E.164 format (`+1234567890`)
- [ ] Ensure all voice agents have `elevenLabsAgentId` set
- [ ] Test ElevenLabs API connection
- [ ] Make a test call and check server logs

## SQL Fixes

If diagnostic script identifies issues, run these SQL commands in Neon SQL Editor:

```sql
-- Fix 1: Activate all voice agents with phone numbers
UPDATE "VoiceAgent" 
SET status = 'ACTIVE' 
WHERE "twilioPhoneNumber" IS NOT NULL 
  AND status != 'ACTIVE';

-- Fix 2: Fix phone number format (example - adjust for your numbers)
UPDATE "VoiceAgent" 
SET "twilioPhoneNumber" = '+1234567890'  -- Replace with correct format
WHERE id = 'agent_id_here';
```

## Testing After Fix

1. Make a test call to your Twilio number
2. Check Vercel logs for:
   - `✅ Call logged for agent: [agent name]`
   - `✅ Got signed WebSocket URL`
   - `✅ Agent is properly configured`
3. Verify call connects to voice agent

## Still Not Working?

If issues persist after following this guide:

1. **Check Vercel Logs**: Look for error messages when calls come in
2. **Verify Domain**: Make sure Twilio webhooks point to correct domain
3. **Test API Key**: Verify ElevenLabs API key is valid
4. **Check Database**: Ensure voice agents exist and are configured correctly
5. **Phone Number Match**: Database phone number must match exactly what Twilio sends

## Related Files

- `/app/api/twilio/voice-callback/route.ts` - Main webhook handler
- `/lib/elevenlabs.ts` - ElevenLabs service
- `/prisma/schema.prisma` - Database schema
- `/scripts/fix-voice-agent-routing.ts` - Diagnostic script
