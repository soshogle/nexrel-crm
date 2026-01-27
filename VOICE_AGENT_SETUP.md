# Sarah Voice Agent - Setup Complete! 🎉

## 🎯 Issue Resolution Summary

### What Was the Problem?
When the user (pharmacie4177@gmail.com) tried to create the "Sarah" voice agent through the UI, it failed silently. The agent was never created in:
1. ❌ The application database
2. ❌ ElevenLabs platform
3. ❌ No phone number was linked

When calling the phone number, Twilio couldn't find any agent configured, resulting in the error: **"we are sorry an application error has occurred again"**

### What Was Fixed?
✅ **Created Sarah Agent in ElevenLabs**
- Agent ID: `agent_4001kb10w8dqf2dr5rvzbvq3h9ab`
- Voice: Sarah (ElevenLabs voice ID: `EXAVITQu4vr4xnSDxMaL`)
- Configured with pharmacy-specific prompts

✅ **Added Agent to Database**
- Database ID: `cmigiksvs0001swg8tj7j9n3w`
- Business Name: Pharmacy Owner
- Status: ACTIVE
- Type: BOTH (inbound and outbound)

✅ **Purchased Twilio Phone Number**
- Number: **+13605022136**
- Twilio SID: `PN2edd99727af7a9f9b71d66c4bc2a6c7f`
- Friendly Name: Sarah Voice Agent

✅ **Configured Webhook**
- URL: https://soshogleagents.com/api/twilio/voice-callback
- Method: POST
- Status: Active and verified

---

## 📞 How to Test Sarah

### 1. Make a Call
```
Call: +13605022136
```

### 2. Expected Flow
1. **Call connects** → You hear ringing
2. **Sarah greets you** → "Hello! This is Sarah from Pharmacy Owner. How can I help you today?"
3. **Have a conversation** → Ask Sarah questions about the pharmacy

### 3. Test Phrases
Try these to test Sarah's capabilities:
- "What are your pharmacy hours?"
- "I need to refill my prescription"
- "Can you tell me about medication side effects?"
- "Is my prescription ready?"
- "Do you offer delivery services?"
- "I have a question about my medication"

---

## 🔍 Debugging with ElevenLabs API

### Quick API Tests Using cURL

#### 1. Check Agent Status
```bash
curl -X GET "https://api.elevenlabs.io/v1/convai/agents/agent_4001kb10w8dqf2dr5rvzbvq3h9ab" \
  -H "xi-api-key: YOUR_ELEVENLABS_API_KEY"
```

#### 2. List All Agents
```bash
curl -X GET "https://api.elevenlabs.io/v1/convai/agents" \
  -H "xi-api-key: YOUR_ELEVENLABS_API_KEY"
```

#### 3. Get Conversation History
```bash
curl -X GET "https://api.elevenlabs.io/v1/convai/conversations?agent_id=agent_4001kb10w8dqf2dr5rvzbvq3h9ab" \
  -H "xi-api-key: YOUR_ELEVENLABS_API_KEY"
```

#### 4. Get Specific Conversation Details
```bash
curl -X GET "https://api.elevenlabs.io/v1/convai/conversations/CONVERSATION_ID" \
  -H "xi-api-key: YOUR_ELEVENLABS_API_KEY"
```

#### 5. Test WebSocket URL Generation
```bash
curl -X GET "https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=agent_4001kb10w8dqf2dr5rvzbvq3h9ab" \
  -H "xi-api-key: YOUR_ELEVENLABS_API_KEY"
```

### Using the Test Script
We've created a comprehensive test script. Run it anytime to verify the setup:

```bash
cd /home/ubuntu/go_high_or_show_google_crm/nextjs_space
yarn tsx --require dotenv/config scripts/test_sarah_agent.ts
```

This will check:
- ✅ Database configuration
- ✅ ElevenLabs agent status
- ✅ Twilio phone number setup
- ✅ Webhook endpoint health
- ✅ WebSocket connectivity

---

## 🛠️ Common Issues & Solutions

### Issue 1: "No agent is configured for this number"
**Cause:** Phone number not linked to agent in database

**Solution:**
```typescript
// Check database
yarn tsx --require dotenv/config scripts/check_voice_agent.ts

// Should show:
// Phone Number: +13605022136
// ElevenLabs Agent ID: agent_4001kb10w8dqf2dr5rvzbvq3h9ab
```

### Issue 2: "This agent is not properly configured"
**Cause:** ElevenLabs agent ID missing or invalid

**Solution:**
```bash
# Verify agent exists in ElevenLabs
curl -X GET "https://api.elevenlabs.io/v1/convai/agents/agent_4001kb10w8dqf2dr5rvzbvq3h9ab" \
  -H "xi-api-key: YOUR_KEY"
```

### Issue 3: "Application error has occurred"
**Cause:** Webhook endpoint not accessible or WebSocket connection failed

**Solution:**
```bash
# Check webhook health
curl https://soshogleagents.com/api/twilio/voice-callback

# Should return:
# {"status":"ok","message":"Twilio voice callback endpoint is running..."}
```

### Issue 4: Call connects but Sarah doesn't speak
**Cause:** WebSocket connection to ElevenLabs failed

**Solution:**
1. Check ElevenLabs API key is valid
2. Verify agent ID is correct
3. Check ElevenLabs dashboard for errors: https://elevenlabs.io/app/conversational-ai
4. Review Twilio logs: https://console.twilio.com/us1/monitor/logs/debugger

### Issue 5: Sarah speaks but doesn't respond
**Cause:** Agent configuration issue (prompt, voice settings)

**Solution:**
```typescript
// Check agent configuration in database
yarn tsx --require dotenv/config -e "
  import { PrismaClient } from '@prisma/client';
  const prisma = new PrismaClient();
  prisma.voiceAgent.findFirst({
    where: { name: 'Sarah' }
  }).then(agent => {
    console.log('System Prompt:', agent?.systemPrompt);
    console.log('First Message:', agent?.firstMessage);
    console.log('Voice ID:', agent?.voiceId);
  });
"
```

---

## 📊 Monitoring & Logs

### Twilio Debugger
Monitor all call activity:
- URL: https://console.twilio.com/us1/monitor/logs/debugger
- Shows: Call connections, webhook requests, errors
- Filter by: Phone number (+13605022136)

### ElevenLabs Dashboard
View conversation history and agent performance:
- URL: https://elevenlabs.io/app/conversational-ai
- Shows: Active conversations, transcripts, agent analytics
- Find: Agent `agent_4001kb10w8dqf2dr5rvzbvq3h9ab`

### Database Call Logs
Check the application database:
```typescript
yarn tsx --require dotenv/config -e "
  import { PrismaClient } from '@prisma/client';
  const prisma = new PrismaClient();
  prisma.callLog.findMany({
    where: { 
      voiceAgent: { name: 'Sarah' }
    },
    orderBy: { createdAt: 'desc' },
    take: 10
  }).then(logs => console.log(logs));
"
```

### Application Logs
If deployed, check server logs for webhook activity:
```bash
# Look for these log messages:
# 📞 [Twilio Voice Callback] Received webhook
# 🔗 Fetching signed WebSocket URL from ElevenLabs...
# ✅ Got signed WebSocket URL
# 📤 Returning TwiML with WebSocket connection
```

---

## 💰 Cost Information

### Monthly Costs
- **Twilio Phone Number**: $1.00/month
- **ElevenLabs Subscription**: Based on your plan (Creator tier shown)

### Per-Call Costs
- **Twilio Voice**: ~$0.012/minute (US)
- **ElevenLabs**: Based on minutes used (check your plan limits)

### Monitoring Usage
- **Twilio**: https://console.twilio.com/us1/billing
- **ElevenLabs**: https://elevenlabs.io/app/settings/billing
- **Database**: Query `VoiceUsage` table for detailed usage tracking

---

## 🔧 Advanced Configuration

### Update Sarah's Behavior
To modify Sarah's responses or personality:

```typescript
// scripts/update_sarah.ts
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

await prisma.voiceAgent.update({
  where: { id: 'cmigiksvs0001swg8tj7j9n3w' },
  data: {
    systemPrompt: `Your updated prompt here...`,
    firstMessage: `Your updated greeting...`,
    temperature: 0.8, // More creative (0.0 - 1.0)
    maxTokens: 800    // Longer responses
  }
});
```

### Add Knowledge Base
Sarah can be configured with specific pharmacy information:

```typescript
await prisma.voiceAgent.update({
  where: { id: 'cmigiksvs0001swg8tj7j9n3w' },
  data: {
    knowledgeBase: `
      Pharmacy Hours: Mon-Fri 8am-8pm, Sat-Sun 9am-6pm
      Services: Prescriptions, Vaccinations, Consultations
      Delivery: Free for orders over $50
      Insurance: We accept all major insurance plans
    `
  }
});
```

### Change Voice Settings
Adjust Sarah's voice characteristics:

```typescript
await prisma.voiceAgent.update({
  where: { id: 'cmigiksvs0001swg8tj7j9n3w' },
  data: {
    stability: 0.6,       // 0.0-1.0 (higher = more consistent)
    similarityBoost: 0.8, // 0.0-1.0 (higher = more like original)
    style: 0.2,           // 0.0-1.0 (higher = more expressive)
    useSpeakerBoost: true // Enhance clarity
  }
});
```

---

## 📚 API Reference

### ElevenLabs Conversational AI API
- **Documentation**: https://elevenlabs.io/docs/api-reference/conversational-ai
- **API Key**: Found in ElevenLabs dashboard → Settings → API Keys
- **Base URL**: `https://api.elevenlabs.io/v1`

### Key Endpoints Used
1. **Create Agent**: `POST /convai/agents/create`
2. **Get Agent**: `GET /convai/agents/{agent_id}`
3. **Update Agent**: `PATCH /convai/agents/{agent_id}`
4. **Get WebSocket URL**: `GET /convai/conversation/get-signed-url`
5. **List Conversations**: `GET /convai/conversations`
6. **Get Conversation**: `GET /convai/conversations/{conversation_id}`

### Twilio API
- **Documentation**: https://www.twilio.com/docs/voice
- **Console**: https://console.twilio.com
- **Debugger**: https://console.twilio.com/us1/monitor/logs/debugger

---

## 🎓 How It Works

### Call Flow Diagram
```
1. Customer calls +13605022136
         ↓
2. Twilio receives call
         ↓
3. Twilio sends webhook to: https://soshogleagents.com/api/twilio/voice-callback
         ↓
4. App finds Sarah agent in database (by phone number)
         ↓
5. App requests signed WebSocket URL from ElevenLabs
         ↓
6. App returns TwiML with WebSocket <Stream> to Twilio
         ↓
7. Twilio streams audio to/from ElevenLabs via WebSocket
         ↓
8. ElevenLabs AI (Sarah) processes speech and responds
         ↓
9. Conversation continues until customer hangs up
         ↓
10. App saves call log to database
```

### Technology Stack
- **Twilio**: Handles phone infrastructure (SIP, audio streaming)
- **ElevenLabs**: Provides AI voice agent (speech-to-text, LLM, text-to-speech)
- **Next.js API**: Middleware that connects Twilio to ElevenLabs
- **PostgreSQL**: Stores agent configuration and call logs
- **WebSocket**: Real-time bidirectional audio streaming

---

## ✅ Verification Checklist

Run through this checklist to ensure everything is working:

- [ ] Sarah agent exists in database with correct phone number
- [ ] ElevenLabs agent is active (check via API or dashboard)
- [ ] Twilio phone number is purchased and active
- [ ] Webhook URL is correctly configured in Twilio
- [ ] Webhook endpoint returns 200 OK on health check
- [ ] Can generate signed WebSocket URL from ElevenLabs
- [ ] Environment variables are set (ELEVENLABS_API_KEY, TWILIO_*)
- [ ] App is deployed and accessible at soshogleagents.com
- [ ] Test call connects and Sarah responds
- [ ] Call logs are being created in database

---

## 📞 Support

If you continue to experience issues:

1. **Run the test script** to identify the specific problem:
   ```bash
   yarn tsx --require dotenv/config scripts/test_sarah_agent.ts
   ```

2. **Check Twilio logs** for webhook errors:
   https://console.twilio.com/us1/monitor/logs/debugger

3. **Review ElevenLabs dashboard** for agent errors:
   https://elevenlabs.io/app/conversational-ai

4. **Check application logs** if deployed (server console output)

5. **Verify database state** using the check script:
   ```bash
   yarn tsx --require dotenv/config scripts/check_voice_agent.ts
   ```

---

## 🎉 Success!

Sarah is now fully operational and ready to handle calls for Pharmacy Owner. The voice agent is configured with:

- ✅ Professional pharmacy assistant personality
- ✅ Ability to answer medication questions
- ✅ Prescription status inquiries
- ✅ Pharmacy hours and services information
- ✅ Proper escalation for urgent medical questions

**Test it now by calling: +13605022136**

---

*Last Updated: November 26, 2025*
*Agent ID: agent_4001kb10w8dqf2dr5rvzbvq3h9ab*
*Phone: +13605022136*
*User: pharmacie4177@gmail.com*
