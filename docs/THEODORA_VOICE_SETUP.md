# Theodora Stavropoulos – Voice Agent Setup

## Phone Number
**(450) 639-2047** → E.164: `+14506392047`

## What You Need from Twilio

The number must be in a Twilio account we can access. You need **one** of these:

### Option A: Same Twilio Account (Recommended)
If the number was purchased in the **same** Twilio account as soshogle@gmail.com:
- **Nothing extra** – the script uses `TWILIO_ACCOUNT_SID` and `TWILIO_AUTH_TOKEN` from `.env`
- Ensure those env vars point to the account that owns (450) 639-2047

### Option B: Different Twilio Account
If Theodora has her **own** Twilio account with this number:
1. **Account SID** – from Twilio Console → Account Info
2. **Auth Token** – from Twilio Console → Account Info
3. Add to `.env` (or create a separate config for her):
   ```
   TWILIO_ACCOUNT_SID=ACxxxxxxxx...
   TWILIO_AUTH_TOKEN=your_auth_token
   ```

## Run the Setup Script

```bash
npx tsx scripts/setup-theodora-voice-agent.ts
```

The script will:
1. Find Theodora (theodora.stavropoulos@remax-quebec.com)
2. Verify (450) 639-2047 exists in the Twilio account
3. Set Twilio webhook → `https://YOUR_APP_URL/api/twilio/voice-callback`
4. Create or update her Voice Agent with the phone number
5. Create ElevenLabs agent and import the number (same flow as soshogle@gmail.com)

## Test

Call **(450) 639-2047** – you should hear Theodora’s AI assistant greeting.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| "Number not found in Twilio" | Number is in a different Twilio account – use Option B |
| "ElevenLabs plan does not support phone numbers" | Upgrade ElevenLabs to Starter or higher |
| "Phone number not found in your Twilio account" | Confirm the number is active in Twilio Console |
| Call goes to voicemail / no answer | Check Twilio webhook is set to our voice-callback URL |

## Manual Fallback

If the script fails at auto-configure:
1. Theodora logs in at your app URL
2. Go to **Voice Agents**
3. Select her agent → **Test** → **Auto-Configure Now**
