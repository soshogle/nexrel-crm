# Twilio + ElevenLabs PBX System

## Overview

You can use your existing **Twilio + ElevenLabs + Workflows** setup to replicate Mango Voice functionality **without paying for Mango Voice**. This document explains how.

## What You Already Have ✅

1. **Twilio Integration**
   - Phone number management
   - Inbound/outbound calls
   - SMS/MMS messaging
   - Webhook handling

2. **ElevenLabs Voice AI**
   - Conversational AI agents
   - Natural voice interactions
   - Call automation

3. **Workflow System**
   - Automated call triggers
   - SMS automation
   - Event-driven workflows

4. **Call Logging**
   - All calls tracked in database
   - Call history
   - Recording support

## New Features Added 🆕

### 1. Screen Pop (Patient Matching)
- **What it does**: Automatically matches incoming calls to patient records
- **How it works**: 
  - When a call comes in, the system searches for matching phone numbers
  - Displays patient info, recent appointments, notes
  - Shows match confidence level

### 2. Enhanced Call Handler
- **File**: `lib/integrations/enhanced-call-handler.ts`
- **Features**:
  - Patient matching on incoming calls
  - Call routing rules
  - Screen pop notifications
  - Workflow triggers

### 3. Call Routing
- Time-based routing (business hours)
- Day-based routing (weekdays/weekends)
- Forward to different numbers
- Voicemail handling

## How It Works

### Incoming Call Flow

```
1. Patient calls → Twilio receives call
2. Twilio webhook → /api/twilio/voice-callback
3. Enhanced handler matches phone number to patient
4. Screen pop notification sent (patient info displayed)
5. Call connected to ElevenLabs AI agent
6. Call logged with patient match
7. Workflows triggered (if configured)
```

### Outbound Call Flow

```
1. Workflow triggers outbound call
2. ElevenLabs initiates call via Twilio
3. Call connected to patient
4. AI agent handles conversation
5. Call logged and recorded
6. Follow-up workflows triggered
```

## Cost Comparison

### Mango Voice
- **Cost**: $32.95-$37.95/user/month
- **For 10 users**: ~$330-380/month
- **For 30 users**: ~$810-960/month

### Your System (Twilio + ElevenLabs)
- **Twilio**: Pay-as-you-go (~$0.01-0.02/minute)
- **ElevenLabs**: Pay-as-you-go (~$0.18-0.30/minute)
- **Estimated cost**: ~$50-200/month (depends on call volume)
- **Savings**: 50-80% cheaper than Mango Voice

## Features Comparison

| Feature | Mango Voice | Your System |
|---------|-------------|-------------|
| Phone Numbers | ✅ Included | ✅ Twilio |
| Inbound Calls | ✅ | ✅ |
| Outbound Calls | ✅ | ✅ |
| Voice AI | ❌ | ✅ ElevenLabs |
| Screen Pops | ✅ | ✅ (Just added) |
| Call Routing | ✅ | ✅ (Just added) |
| SMS/MMS | ✅ (Plus plan) | ✅ Twilio |
| Call Recording | ✅ | ✅ |
| Call Analytics | ✅ | ✅ |
| Workflow Automation | ❌ | ✅ (Your workflows) |
| Multi-clinic Support | ✅ | ✅ (Your system) |

## Setup Instructions

### 1. Configure Twilio Webhooks

In Twilio Console → Phone Numbers → Your Number:
- **Voice Webhook**: `https://your-domain.com/api/twilio/voice-callback`
- **Status Callback**: `https://your-domain.com/api/twilio/call-status`

### 2. Create Voice Agents

1. Go to Voice Agents page
2. Create new agent
3. Assign Twilio phone number
4. Configure ElevenLabs agent ID
5. Set up workflows (optional)

### 3. Enable Screen Pops

Screen pops are automatically enabled. When a patient calls:
- System matches phone number
- Patient info appears in call log
- Recent appointments/notes shown
- Workflows can trigger automatically

### 4. Set Up Call Routing

Configure routing rules in your voice agent settings:
- Business hours
- Forwarding rules
- Voicemail settings

## API Endpoints

### Incoming Call Webhook
```
POST /api/twilio/voice-callback
```
- Handles incoming calls
- Matches patients
- Connects to ElevenLabs
- Triggers workflows

### Call Status Webhook
```
POST /api/twilio/call-status
```
- Receives call completion events
- Fetches recordings/transcripts
- Updates call logs

### Outbound Call API
```
POST /api/outbound-calls
```
- Initiates outbound calls
- Uses workflows
- Tracks call status

## Workflow Integration

Your workflows can:
- ✅ Trigger calls automatically
- ✅ Send SMS reminders
- ✅ Handle call follow-ups
- ✅ Update patient records
- ✅ Create appointments
- ✅ Send notifications

## Next Steps

1. **Test incoming calls**: Call your Twilio number and verify patient matching
2. **Set up workflows**: Create workflows for common call scenarios
3. **Configure routing**: Set business hours and forwarding rules
4. **Monitor costs**: Track Twilio/ElevenLabs usage
5. **Optimize**: Adjust based on call patterns

## Advantages Over Mango Voice

1. **Cost**: 50-80% cheaper
2. **Flexibility**: Full control over features
3. **Integration**: Works with your existing workflows
4. **AI**: Better voice AI with ElevenLabs
5. **Customization**: Can add any feature you need
6. **Multi-clinic**: Already supports multiple clinics

## Support

If you need help:
- Check Twilio webhook configuration
- Verify ElevenLabs agent setup
- Review workflow triggers
- Check call logs for errors
