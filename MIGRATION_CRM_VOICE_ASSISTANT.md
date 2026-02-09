# CRM Voice Assistant Migration Guide

## Overview
This migration adds a global voice assistant to the CRM, similar to the conversational AI on the landing page (nexrel.soshogle.com). The voice assistant is available throughout the entire CRM and can help users with all CRM operations.

## Database Changes

### 1. Add CRM Voice Agent ID to User Model

```sql
ALTER TABLE "User" ADD COLUMN "crmVoiceAgentId" TEXT;
```

## Features Implemented

### 1. Global Voice Assistant Widget
- Floating button in bottom-right corner
- Expandable conversation interface
- Minimizable/maximizable
- Available on all CRM pages
- Uses same ElevenLabsAgent component as landing page

### 2. CRM Voice Agent Service
- Automatic agent creation on first use
- Agent verification and recreation if needed
- CRM-specific system prompt
- Multi-language support
- Voice customization

### 3. API Endpoints
- `GET /api/crm-voice-agent`: Get or create CRM voice agent
- `PATCH /api/crm-voice-agent`: Update agent configuration
- `POST /api/voice-assistant/chat`: Process voice-transcribed text (for future hybrid approach)

## Implementation Details

### Component Structure
```
components/dashboard/
  └── global-voice-assistant.tsx    (NEW - Main component)

lib/
  └── crm-voice-agent.ts            (NEW - Agent management service)

app/api/
  ├── crm-voice-agent/route.ts      (NEW - Agent management API)
  └── voice-assistant/chat/route.ts (NEW - Voice chat endpoint)
```

### Integration Points
- Added to `components/dashboard/dashboard-wrapper.tsx`
- Available on all dashboard pages
- Uses existing `ElevenLabsAgent` component
- Integrates with existing ElevenLabs provisioning service

## Migration Steps

1. **Run Database Migration:**
   ```sql
   ALTER TABLE "User" ADD COLUMN "crmVoiceAgentId" TEXT;
   ```

2. **Deploy Code Changes:**
   - All code changes are backward compatible
   - No breaking changes
   - Voice assistant is opt-in (only shows if agent is created)

3. **Test Voice Assistant:**
   - Log into CRM
   - Look for floating microphone button (bottom-right)
   - Click to open voice assistant
   - Test conversation
   - Verify agent creation in database

## Usage

### For Users:
1. Click the floating microphone button
2. Grant microphone permissions when prompted
3. Start speaking to the CRM assistant
4. Ask questions or request actions:
   - "Create a contact for John Smith"
   - "Show me my leads"
   - "Set up Stripe payments"
   - "Create a workflow that sends emails when leads are created"

### Agent Capabilities:
- Create and manage leads, deals, contacts
- Set up integrations (Stripe, Twilio, email, etc.)
- Create and manage workflows
- Answer questions about CRM features
- Navigate to different parts of the CRM
- Provide statistics and insights

## Technical Notes

### Agent Creation:
- Automatically created on first use
- Stored in `User.crmVoiceAgentId`
- Uses ElevenLabs provisioning service
- CRM-specific system prompt
- Default voice: Sarah (EXAVITQu4vr4xnSDxMaL)

### Conversation Flow:
- User speaks → ElevenLabs ASR → Text
- Text processed by agent's system prompt
- Agent responds → ElevenLabs TTS → User hears
- Real-time bidirectional conversation

### Future Enhancements:
- Function calling integration for direct CRM operations
- Conversation history storage
- Custom voice selection
- Multi-language agent switching

## Testing Checklist

- [ ] Database migration runs successfully
- [ ] Voice assistant button appears on dashboard
- [ ] Clicking button opens voice assistant widget
- [ ] Microphone permission prompt works
- [ ] Agent is created automatically on first use
- [ ] Agent ID is stored in user record
- [ ] Conversation starts successfully
- [ ] User can speak and be understood
- [ ] Agent responds with voice
- [ ] Widget can be minimized/maximized
- [ ] Widget can be closed
- [ ] Agent persists across page navigation

## Notes

- Voice assistant uses the same technology as the landing page
- Agent is created per user (one CRM voice agent per user)
- Agent configuration can be updated via API
- System prompt includes CRM knowledge and capabilities
- Supports multiple languages based on user preference
