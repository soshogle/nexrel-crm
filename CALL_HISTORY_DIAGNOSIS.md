# 📞 Call History Diagnosis & Fix Guide

## 🔍 What I Found

I analyzed your database and found:
- **19 total calls** in your system
- **0 INBOUND calls** ❌ (This is why you only see outbound)
- **19 OUTBOUND calls** ✅
- **ALL calls stuck at "INITIATED" status** ❌ (This is why no recordings/transcripts)

## 🎯 Root Cause

### Problem 1: No Inbound Calls
Your Twilio phone numbers are **not configured** to send incoming calls to your app's webhook. When someone calls your Twilio numbers, Twilio doesn't know where to send the call.

### Problem 2: No Recordings/Transcripts
Your Twilio phone numbers don't have a **Status Callback URL** configured. This means:
- Twilio never tells your app when calls complete
- Your app can't fetch recordings from ElevenLabs
- Calls stay stuck at "INITIATED" forever

## 🔧 How to Fix (Step-by-Step)

### Step 1: Configure Voice Webhook (For Inbound Calls)

1. Go to your Twilio Console: https://console.twilio.com/us1/develop/phone-numbers/manage/incoming

2. Click on each phone number you want to use

3. Scroll to **"Voice Configuration"**

4. Under **"A CALL COMES IN"**, set:
   ```
   Webhook:     https://go-high-or-show-goog-8dv76n.abacusai.app/api/twilio/voice-callback
   HTTP Method: POST
   ```

5. Click **Save**

### Step 2: Configure Status Callback (For Recordings)

1. On the same phone number configuration page

2. Under **"STATUS CALLBACK URL"**, set:
   ```
   URL:         https://go-high-or-show-goog-8dv76n.abacusai.app/api/twilio/call-status
   HTTP Method: POST
   ```

3. Click **Save**

4. Repeat for ALL your Twilio numbers

## 📊 What ElevenLabs Provides

Your system is already integrated with ElevenLabs to fetch:

### 1. Call Recordings
- **API**: `GET /v1/convai/conversations/{id}/audio`
- **Format**: MP3 audio file
- **Retention**: ~30 days (plan-dependent)
- **Your Access**: Via internal proxy at `/api/calls/audio/[conversationId]`

### 2. Transcripts
- **API**: `GET /v1/convai/conversations/{id}`
- **Format**: Array of conversation turns with timestamps
- **Structure**: 
  ```json
  {
    "transcript": [
      {
        "role": "agent",
        "message": "Hello! How can I help you today?",
        "time_in_call_secs": 0.5
      },
      {
        "role": "user", 
        "message": "I need to book an appointment",
        "time_in_call_secs": 3.2
      }
    ]
  }
  ```

### 3. AI Summary
- **API**: Same endpoint as transcripts
- **Format**: JSON metadata with call insights
- **Content**: ElevenLabs-generated summary of the conversation

## 🎨 How to View Recordings in Messages

Once webhooks are configured, here's how it works:

### In the Messages Page:

1. **Navigate to Messages** (`/dashboard/messages`)

2. **Select a Conversation** (contact/phone number)

3. **Click the "Call History" tab** (next to "Messages")

4. **You'll see call cards with**:
   - 📞 Call direction icon (INBOUND/OUTBOUND)
   - ⏱️ Duration
   - 📅 Date/time
   - 🎯 Voice agent used
   - ✅ Status badge

5. **For each call**:
   - Click **▶️ Play** to listen to the recording
   - Click **📄 Show Details** to expand and see:
     - Full transcript with timestamps
     - AI-generated conversation summary

### Visual Example:
```
╔═══════════════════════════════════════════════════╗
║  Messages Page                                    ║
╠═══════════════════════════════════════════════════╣
║  ┌─────────────────┬──────────────────────────┐  ║
║  │ Conversations   │ [ Messages | Call History]│  ║
║  │                 │                            │  ║
║  │ > John Doe      │  📱 INBOUND • COMPLETED   │  ║
║  │   +15149928774  │  Duration: 3m 45s         │  ║
║  │                 │  Agent: Dentist Bot       │  ║
║  │ > Jane Smith    │  Nov 23, 2025 at 2:34 PM  │  ║
║  │   +15149691050  │                            │  ║
║  │                 │  [▶️ Play] [📄 Details]    │  ║
║  │                 │                            │  ║
║  │                 │  ────────────────────────  │  ║
║  │                 │                            │  ║
║  │                 │  📞 OUTBOUND • COMPLETED   │  ║
║  │                 │  Duration: 2m 15s         │  ║
║  │                 │  Agent: Sales Bot         │  ║
║  │                 │  Nov 22, 2025 at 10:15 AM │  ║
║  │                 │                            │  ║
║  │                 │  [▶️ Play] [📄 Details]    │  ║
║  └─────────────────┴──────────────────────────┘  ║
╚═══════════════════════════════════════════════════╝
```

## 🧪 Testing After Configuration

### Test 1: Inbound Call
1. Call your Twilio number from your phone
2. Talk to the AI agent for at least 30 seconds
3. Hang up
4. Wait 10 seconds
5. Go to Messages → Select the conversation → Call History tab
6. **Expected Result**: 
   - Direction: INBOUND
   - Status: COMPLETED
   - Duration: Shows actual time
   - Play button works
   - Transcript appears when expanded

### Test 2: Outbound Call
1. Go to Messages page
2. Click the phone icon (📞) next to a contact
3. Talk to the AI agent for at least 30 seconds
4. Hang up
5. Wait 10 seconds
6. Refresh and check Call History tab
7. **Expected Result**: Same as above, but Direction: OUTBOUND

## 🔍 Troubleshooting

### If Recordings Don't Appear:

**Issue**: "No recording available"
- **Cause**: Call was too short (< 10 seconds)
- **Solution**: Make longer test calls

**Issue**: Calls still show "INITIATED"
- **Cause**: Status callback not configured correctly
- **Solution**: Double-check the webhook URL and ensure it's saved

**Issue**: 404 error when playing recording
- **Cause**: ElevenLabs conversation ID is invalid
- **Solution**: This shouldn't happen for new calls, but you can manually backfill old calls:
  ```javascript
  // Open browser console on /dashboard/messages
  fetch('/api/calls/fetch-recording', { method: 'GET' })
  ```

### If Inbound Calls Don't Show:

**Issue**: No INBOUND calls in history
- **Cause**: Voice webhook not configured
- **Solution**: Verify the webhook URL is set for ALL numbers
- **Test**: Call your number and check server logs

## 📋 Technical Details

### How the System Works:

1. **Call Initiated**:
   - Twilio → Your Voice Webhook
   - System creates CallLog (status: IN_PROGRESS)
   - Returns TwiML to connect to ElevenLabs WebSocket

2. **Call Happens**:
   - ElevenLabs handles the conversation
   - Records audio
   - Generates transcript
   - Stores conversation data

3. **Call Ends**:
   - Twilio → Your Status Callback
   - System updates CallLog (status: COMPLETED)
   - **Automatically fetches** from ElevenLabs:
     - Recording URL → Stores proxy URL
     - Transcript → Stores formatted text
     - AI Summary → Stores conversation data

4. **User Views**:
   - Opens Messages → Call History tab
   - Clicks Play → Audio streams via proxy
   - Clicks Details → Shows transcript + summary

### API Endpoints:

| Endpoint | Purpose | Called By |
|----------|---------|-----------|
| `/api/twilio/voice-callback` | Handle incoming calls | Twilio |
| `/api/twilio/call-status` | Update call status + fetch recordings | Twilio |
| `/api/calls/conversation-history` | Get call history for UI | Frontend |
| `/api/calls/audio/[id]` | Proxy ElevenLabs audio | Audio player |
| `/api/calls/fetch-recording` | Manual backfill (if needed) | Admin |

## ✅ Success Checklist

After completing setup:

- [ ] Configured Voice Webhook for all Twilio numbers
- [ ] Configured Status Callback for all Twilio numbers
- [ ] Made test inbound call → Appears in history
- [ ] Made test outbound call → Appears in history
- [ ] Both calls show "COMPLETED" status
- [ ] Can play recordings with Play button
- [ ] Can see transcripts with Show Details
- [ ] Can see AI summaries
- [ ] Both INBOUND and OUTBOUND calls visible

## 🎉 What You'll Have After Setup

Once configured, your Messages page will be a complete communication hub:

### Messages Tab:
- SMS/Email conversations
- Send/receive messages
- Contact search

### Call History Tab:
- Complete call log (inbound + outbound)
- Playable recordings
- Full transcripts with timestamps
- AI-generated conversation summaries
- Filterable by contact/phone number

## 📚 Additional Resources

- **Twilio Voice Configuration**: https://www.twilio.com/docs/voice/tutorials/how-to-respond-to-incoming-phone-calls
- **ElevenLabs Conversational AI**: https://elevenlabs.io/docs/conversational-ai/overview
- **Your Deployment URL**: https://go-high-or-show-goog-8dv76n.abacusai.app

---

## 🚨 Important Notes

1. **ElevenLabs Account Capacity**: Your current account is at **99.99% capacity** (39,178/39,180 characters used). You'll need to upgrade or wait for the monthly reset to make new calls.

2. **Recording Retention**: ElevenLabs keeps recordings for a limited time (usually 30 days). After that, the audio URLs expire.

3. **Webhook Security**: Your webhooks are currently open. Consider adding Twilio signature validation for production use.

4. **Call Duration**: For transcripts to be generated, calls should be at least 10-15 seconds long.

---

**Built**: November 23, 2025  
**Status**: ✅ System Ready - Webhooks Need Configuration  
**Action Required**: Configure Twilio webhooks in console

