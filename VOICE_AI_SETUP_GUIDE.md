# Voice AI Setup Guide

## Overview
This guide explains how your Voice AI system works and how to create new agents that automatically connect to ElevenLabs with Twilio phone numbers.

## System Architecture

### How It Works
1. **CRM Agent Creation**: When you create an agent in your CRM with a Twilio phone number
2. **Auto-Configuration**: The system automatically:
   - Creates a conversational AI agent in ElevenLabs
   - Imports the Twilio phone number into ElevenLabs
   - Assigns the phone number to the agent
   - Updates Twilio webhook to route calls to ElevenLabs
   - Saves all configuration in your database

### Current Setup

#### Sarah Agent (FIXED ✅)
- **Name**: Sarah
- **ElevenLabs Agent ID**: `agent_4001kb10w8dqf2dr5rvzbvq3h9ab`
- **Phone Number**: +13605022136
- **ElevenLabs Phone ID**: `phnum_0801kb11q1fefje8m0bbba6z6qgm`
- **Status**: ACTIVE
- **Greeting**: "Hello! This is Sarah from the pharmacy. How can I help you today?"

#### What Was Fixed
1. ✅ Imported +13605022136 into ElevenLabs
2. ✅ Assigned phone number to Sarah agent
3. ✅ Updated Twilio webhook to point to ElevenLabs
4. ✅ Updated database with phone number ID

## Creating New Voice Agents

### Automatic Flow (Recommended)

When you create a new agent in your CRM:

```typescript
// The system automatically calls the auto-configure endpoint
POST /api/voice-agents/{agentId}/auto-configure
```

This endpoint will:
1. Check if agent already exists in ElevenLabs
2. Create new agent if needed
3. Import and assign the Twilio phone number
4. Update Twilio webhook
5. Save configuration in database

### Manual Setup (If Needed)

If you need to manually configure an agent:

#### Step 1: Import Phone Number to ElevenLabs
```bash
curl -X POST "https://api.elevenlabs.io/v1/convai/phone-numbers" \
  -H "xi-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "phone_number": "+1234567890",
    "label": "Agent Name - +1234567890",
    "sid": "YOUR_TWILIO_ACCOUNT_SID",
    "token": "YOUR_TWILIO_AUTH_TOKEN"
  }'
```

Response:
```json
{"phone_number_id": "phnum_..."}
```

#### Step 2: Assign Phone to Agent
```bash
curl -X PATCH "https://api.elevenlabs.io/v1/convai/phone-numbers/{phone_number_id}" \
  -H "xi-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"agent_id": "agent_..."}'
```

#### Step 3: Update Twilio Webhook
```bash
curl -X POST "https://api.twilio.com/2010-04-01/Accounts/{AccountSid}/IncomingPhoneNumbers/{PhoneNumberSid}.json" \
  --data-urlencode "VoiceUrl=https://api.elevenlabs.io/twilio/inbound_call" \
  -u "ACCOUNT_SID:AUTH_TOKEN"
```

#### Step 4: Update Database
```typescript
await prisma.voiceAgent.update({
  where: { id: agentId },
  data: {
    elevenLabsAgentId: 'agent_...',
    elevenLabsPhoneNumberId: 'phnum_...',
    status: 'ACTIVE'
  }
});
```

## Testing Voice Agents

### Testing Sarah Agent
1. **Call the number**: +13605022136
2. **Expected behavior**: 
   - Sarah answers: "Hello! This is Sarah from the pharmacy. How can I help you today?"
   - You can have a conversation about medications, prescriptions, pharmacy hours, etc.
   - Sarah will direct urgent medical questions to a pharmacist

### Verification Commands

#### Check Agent Status
```bash
cd /home/ubuntu/go_high_or_show_google_crm/nextjs_space
yarn tsx --require dotenv/config scripts/check_voice_agent.ts
```

#### Verify ElevenLabs Agent
```bash
curl -s -H "xi-api-key: YOUR_API_KEY" \
  "https://api.elevenlabs.io/v1/convai/agents/{agent_id}" | jq '.phone_numbers'
```

#### Check Twilio Phone Numbers
```bash
curl -s -u "$TWILIO_ACCOUNT_SID:$TWILIO_AUTH_TOKEN" \
  "https://api.twilio.com/2010-04-01/Accounts/$TWILIO_ACCOUNT_SID/IncomingPhoneNumbers.json" \
  | jq '.incoming_phone_numbers[] | {phone_number, voice_url}'
```

## Available Phone Numbers

### In ElevenLabs
- ✅ +13605022136 → Sarah Agent
- ✅ +14509901011 → testing agent
- ⚪ +19048170321 → Not assigned
- ✅ +14506391671 → Dentist
- ⚪ +14508091703 → Not assigned

### Ready to Use
You have 2 unassigned numbers ready for new agents:
- +19048170321
- +14508091703

## Creating a New Agent with Available Number

### Example: Create a Dentist Agent

```typescript
// 1. Create voice agent in CRM
const agent = await prisma.voiceAgent.create({
  data: {
    name: 'Dr. Smith',
    businessName: 'Smith Dental Clinic',
    businessIndustry: 'Healthcare - Dentistry',
    greetingMessage: 'Hello! This is Dr. Smith\'s office. How can I help you today?',
    systemPrompt: 'You are a helpful dental office assistant...',
    twilioPhoneNumber: '+19048170321', // Use available number
    language: 'en',
    type: 'BOTH',
    userId: userId
  }
});

// 2. Auto-configure (this happens automatically via API)
const response = await fetch(`/api/voice-agents/${agent.id}/auto-configure`, {
  method: 'POST'
});

const result = await response.json();
console.log('Agent configured:', result.agentId);
console.log('Phone registered:', result.phoneRegistered);
```

## Troubleshooting

### Issue: "Phone number not imported"
**Solution**: Run auto-configure endpoint again:
```bash
curl -X POST "https://soshogleagents.com/api/voice-agents/{agent_id}/auto-configure" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Issue: "Agent exists but no phone"
**Solution**: The system will detect this and re-import the phone automatically.

### Issue: "Calls not working"
**Check**:
1. Phone number exists in ElevenLabs: `curl ... /v1/convai/phone-numbers`
2. Phone assigned to agent: Check agent's `phone_numbers` array
3. Twilio webhook points to ElevenLabs: Check `voice_url`
4. Database has correct IDs: Run `check_voice_agent.ts`

### Issue: "Duplicate agents created"
**Prevention**: The auto-configure endpoint now checks if a phone is already assigned to an agent before creating a new one.

## Best Practices

1. **Always use auto-configure**: Let the system handle the setup automatically
2. **One phone per agent**: Each agent should have exactly one phone number
3. **Test before production**: Call the number to verify it works
4. **Monitor logs**: Check console logs for any warnings or errors
5. **Keep database in sync**: Always update database after ElevenLabs changes

## Environment Variables Required

```env
ELEVENLABS_API_KEY=sk_...
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+13605022136  # Default number
```

## API Endpoints

### Auto-Configure Agent
```
POST /api/voice-agents/{id}/auto-configure
```
Automatically sets up ElevenLabs agent with phone number.

### Create Voice Agent
```
POST /api/voice-agents
Body: { name, businessName, twilioPhoneNumber, ... }
```

### List Voice Agents
```
GET /api/voice-agents
```

### Get Agent Details
```
GET /api/voice-agents/{id}
```

### Update Agent
```
PATCH /api/voice-agents/{id}
Body: { name, greetingMessage, ... }
```

### Delete Agent
```
DELETE /api/voice-agents/{id}
```

## Next Steps

### Recommended Actions:

1. **Test Sarah Agent** ✅
   - Call +13605022136
   - Verify the conversation works properly

2. **Create Additional Agents**
   - Use the available phone numbers (+19048170321 or +14508091703)
   - Let the system auto-configure them

3. **Monitor Performance**
   - Check ElevenLabs dashboard for call analytics
   - Review Twilio logs for any issues

4. **Scale Up**
   - Purchase more Twilio numbers as needed
   - Create more agents in your CRM
   - System will handle everything automatically

## Support

If you encounter any issues:
1. Check the logs in the browser console
2. Run the verification scripts
3. Review this guide
4. Check ElevenLabs and Twilio dashboards

---

**Last Updated**: November 26, 2025  
**System Status**: ✅ All agents configured and working
