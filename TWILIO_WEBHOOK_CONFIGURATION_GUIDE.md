# 🔧 Twilio Webhook Configuration Guide

## ✅ Your System is Ready!

Your application's webhook endpoints are **live and working**. Now you just need to configure Twilio to send webhooks to them.

---

## 📋 Your Webhook URLs

Copy these URLs - you'll need them in the Twilio console:

```
Voice Webhook (for inbound calls):
https://go-high-or-show-goog-8dv76n.abacusai.app/api/twilio/voice-callback

Status Callback (for recordings/transcripts):
https://go-high-or-show-goog-8dv76n.abacusai.app/api/twilio/call-status
```

---

## 🎯 What Each Webhook Does

### 1. Voice Webhook
- **Purpose**: Handles incoming calls
- **Connects calls to**: ElevenLabs AI agents via WebSocket
- **Result**: Inbound calls will work

### 2. Status Callback  
- **Purpose**: Receives call completion events
- **Fetches from ElevenLabs**:
  - ✅ Call recordings (MP3 audio)
  - ✅ Full transcripts with timestamps
  - ✅ AI-generated conversation summaries
- **Result**: Recordings and transcripts appear in Call History

---

## 🚀 Step-by-Step Configuration

### Step 1: Access Your Twilio Console

1. Go to: https://console.twilio.com/us1/develop/phone-numbers/manage/incoming
2. Log in to your Twilio account

### Step 2: Configure EACH Phone Number

You need to do this for **all** your Twilio numbers. Repeat for:
- `+14506391671` (testing agent number)
- `+19048170321` (Dentist agent number)
- Any other numbers you want to use

For each number:

#### A. Click on the phone number

#### B. Scroll to "Voice Configuration"

#### C. Under "A CALL COMES IN"
```
Configure with: Webhooks, TwiML Bins, Functions, Studio, or Proxy
Webhook: https://go-high-or-show-goog-8dv76n.abacusai.app/api/twilio/voice-callback
HTTP Method: POST
```

#### D. Under "STATUS CALLBACK URL" (This is critical!)
```
URL: https://go-high-or-show-goog-8dv76n.abacusai.app/api/twilio/call-status
HTTP Method: POST
```

#### E. Click "Save Configuration" at the bottom

### Step 3: Verify Configuration

After configuring, you should see:
- ✅ Voice URL: `...voice-callback`
- ✅ Status Callback URL: `...call-status`
- ✅ Both set to POST

---

## 🧪 Testing After Configuration

### Test 1: Make an Outbound Call

1. Go to your app: https://go-high-or-show-goog-8dv76n.abacusai.app/dashboard/messages

2. Click the phone icon (📞) next to any contact

3. Talk to the AI for at least **30 seconds** (this is important!)

4. Hang up

5. Wait **10-15 seconds** for ElevenLabs to process

6. Click on the conversation → "Call History" tab

**Expected Result:**
- Direction: OUTBOUND
- Status: COMPLETED (not "INITIATED")
- Duration: Shows actual call time
- **▶️ Play button works** (you can listen to recording)
- **📄 Show Details** reveals transcript

### Test 2: Make an Inbound Call

1. Call your Twilio number: `+19048170321`

2. Talk to the AI agent for at least **30 seconds**

3. Hang up

4. Wait **10-15 seconds**

5. Go to Messages → Find the conversation → Call History tab

**Expected Result:**
- Direction: INBOUND (not just outbound anymore!)
- Status: COMPLETED
- Recording plays
- Transcript shows

---

## 📊 What You'll See in Call History

### Before Configuration (Current State)
```
Direction: OUTBOUND
Status: INITIATED ❌
Duration: N/A
Recording: NO ❌
Transcript: NO ❌
```

### After Configuration (Fixed!)
```
Direction: INBOUND / OUTBOUND ✅
Status: COMPLETED ✅
Duration: 3m 45s ✅
Recording: [▶️ Play] ✅
Transcript: [📄 Full conversation with timestamps] ✅
```

---

## 🎬 How It Works Behind the Scenes

### Outbound Call Flow:
1. You click "Call" in your app
2. App creates `CallLog` (status: INITIATED)
3. Twilio initiates call
4. **Status Callback fires when call ends**
5. Your app fetches from ElevenLabs:
   - Recording URL → `/api/calls/audio/{conversationId}` (secure proxy)
   - Transcript → Formatted with timestamps
   - AI Summary → Conversation insights
6. App updates `CallLog` (status: COMPLETED + recording + transcript)
7. You see it in Call History UI

### Inbound Call Flow:
1. Someone calls your Twilio number
2. Twilio hits your **Voice Webhook**
3. Your app returns TwiML with WebSocket to ElevenLabs
4. Call connects to AI agent
5. **Status Callback fires when call ends**
6. (Same steps 5-7 as above)

---

## 🔍 Troubleshooting

### Problem: Calls still show "INITIATED"

**Cause**: Status Callback not configured

**Solution**:
- Double-check the Status Callback URL is set for ALL numbers
- Verify it's set to POST (not GET)
- Make sure you clicked "Save Configuration"

---

### Problem: "No recording available"

**Causes**:
1. Call was too short (< 10 seconds)
2. ElevenLabs hasn't processed it yet
3. ElevenLabs account at capacity

**Solutions**:
1. Make longer test calls (30+ seconds)
2. Wait 15-30 seconds after hanging up
3. Check your ElevenLabs account usage (you're at 99.99% capacity!)

---

### Problem: Recording plays but transcript is empty

**Cause**: Call too short or no speech detected

**Solution**: Make a longer call with actual conversation

---

### Problem: Inbound calls don't show up

**Cause**: Voice Webhook not configured

**Solution**:
- Verify Voice Webhook is set for the number
- Call the number and check server logs
- Ensure you saved the configuration

---

## ⚠️ Important Notes

### 1. ElevenLabs Account Capacity

Your current usage: **99.99%** (39,178/39,180 characters)

⚠️ **New calls may fail until you:**
- Upgrade your plan
- Wait for monthly reset
- Enable usage-based billing
- Add a backup API key (we discussed this!)

### 2. Recording Retention

- ElevenLabs keeps recordings for **~30 days** (plan-dependent)
- After that, the audio URLs expire
- Transcripts remain in your database forever

### 3. Call Duration Minimum

For reliable transcripts:
- Make calls at least **10-15 seconds** long
- Shorter calls may not generate transcripts

---

## 📞 Your Phone Numbers

Configure webhooks for these:

| Number | Agent | Type |
|--------|-------|------|
| +14506391671 | testing agent | INBOUND |
| +19048170321 | Dentist | INBOUND |

---

## 🎯 Configuration Checklist

Before testing, verify:

- [ ] Logged into Twilio console
- [ ] Found phone numbers page
- [ ] For EACH number:
  - [ ] Set Voice Webhook to `...voice-callback`
  - [ ] Set to POST
  - [ ] Set Status Callback to `...call-status`
  - [ ] Set to POST  
  - [ ] Clicked "Save Configuration"
- [ ] Made test outbound call (30+ seconds)
- [ ] Waited 15 seconds
- [ ] Checked Call History for recording
- [ ] Made test inbound call (30+ seconds)
- [ ] Verified inbound call shows in history

---

## 🚨 Critical Reminder

**I cannot configure these webhooks for you** because I don't have access to your Twilio console.

You MUST log in to Twilio and set these URLs manually.

---

## 📚 Twilio Documentation

If you need more help:
- [Twilio Voice Configuration](https://www.twilio.com/docs/voice/tutorials/how-to-respond-to-incoming-phone-calls)
- [Status Callbacks](https://www.twilio.com/docs/voice/api/call-resource#statuscallback)

---

## ✅ Success Indicators

After configuration, you'll know it's working when:

1. ✅ New calls show status: COMPLETED (not INITIATED)
2. ✅ Call History shows both INBOUND and OUTBOUND calls
3. ✅ Play button works for recordings
4. ✅ Transcripts appear when you expand call details
5. ✅ Duration is accurate
6. ✅ AI summary shows in conversation data

---

## 🎉 Once Configured

Your CRM will have:
- 📞 Full call tracking (inbound + outbound)
- 🎙️ Automatic call recordings
- 📝 AI-generated transcripts
- 🤖 Conversation summaries
- 📊 Complete call analytics

All automatically captured and stored!

---

**Status**: ✅ System Ready - Awaiting Twilio Configuration  
**Next Step**: Configure webhooks in Twilio console (5 minutes)  
**Your App**: https://go-high-or-show-goog-8dv76n.abacusai.app

