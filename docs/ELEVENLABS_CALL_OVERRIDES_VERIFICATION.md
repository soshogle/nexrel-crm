# ElevenLabs Call API Override Verification

## Summary

This document describes the verification of **runtime overrides** (voice, language, etc.) for the ElevenLabs Conversational AI call endpoint, and how to use them for pre-configured agents.

## Current State

### How We Call ElevenLabs

- **Endpoint:** `POST https://api.elevenlabs.io/v1/convai/agents/{agentId}/call`
- **Body:** `{ "phone_number": "<E.164>" }`
- **Usage:** `lib/elevenlabs.ts` → `initiatePhoneCall(agentId, phoneNumber)`

### Call Flow

1. Resolve agent ID from `UserAIEmployee.voiceAgentId` → `VoiceAgent.elevenLabsAgentId`, or fallback to `ELEVENLABS_DEFAULT_AGENT_ID`
2. Call `initiatePhoneCall(agentId, phoneNumber)`
3. No per-call customization (voice, language) is passed today

## ElevenLabs Override Support

Per [ElevenLabs Overrides docs](https://elevenlabs.io/docs/agents-platform/customization/personalization/overrides):

- **Overridable fields:** `voice_id`, `language`, `stability`, `speed`, `similarity_boost`, system prompt, first message, LLM
- **Requirement:** Agent must have overrides **enabled** in the ElevenLabs dashboard → Agent → Security tab
- **Format:** `conversation_config_override` object when starting a conversation

Example:

```json
{
  "conversation_config_override": {
    "agent": { "language": "es" },
    "tts": {
      "voice_id": "custom_voice_id",
      "stability": 0.7,
      "speed": 1.1,
      "similarity_boost": 0.9
    }
  }
}
```

## Verification

### Run the Verification Script

```bash
# Dry run (no call, just validate agent and print payload)
npm run verify:elevenlabs-overrides -- --dry-run

# Actual test (initiates a call - requires TEST_PHONE_NUMBER)
TEST_PHONE_NUMBER=+15551234567 npm run verify:elevenlabs-overrides
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ELEVENLABS_API_KEY` | Yes | ElevenLabs API key (from `.env.local`) |
| `ELEVENLABS_AGENT_ID` | No | Override – when unset, uses first VoiceAgent from DB |
| `TEST_PHONE_NUMBER` | For live test | E.164 phone number (e.g. `+15551234567`) |

**Agent source:** If `ELEVENLABS_AGENT_ID` is not set, the script uses:
1. **User.crmVoiceAgentId** – the same agent used by AI Brain chat (created when you first use it)
2. **VoiceAgent** – fallback if no user has a CRM agent

### Expected Outcomes

1. **Success (200):** Overrides are supported. You can use `conversation_config_override` for pre-configured agents.
2. **Validation error (400/422):** If the error mentions `conversation_config_override` or "unknown field", the call endpoint may not support overrides. Check ElevenLabs API changelog.
3. **Other errors:** 404 (agent/phone), 402 (credits), etc.

## Code Changes Made

### 1. `lib/elevenlabs.ts`

- Added `ConversationConfigOverride` interface
- Updated `initiatePhoneCall(agentId, phoneNumber, override?)` to accept optional `override`
- When `override` is provided, it is sent as `conversation_config_override` in the request body

### 2. `scripts/verify-elevenlabs-call-overrides.ts`

- Verification script to test the call endpoint with overrides
- `--dry-run`: Validate agent, print payload, no call
- `--no-overrides`: Test baseline (no override) for comparison

### 3. `package.json`

- Added script: `verify:elevenlabs-overrides`

## Implemented (Pre-configured Agents)

1. **Extend `UserAIEmployee`** (or config table) with:
   - `voiceId` (ElevenLabs voice ID)
   - `language` (e.g. `en`, `es`)
   - `stability`, `speed`, `similarityBoost` (optional)

2. **Create template agents** (legacy – now using voiceConfig) per employee type in Nexrel’s ElevenLabs account, with overrides enabled.

3. **At call time:** Resolve config from DB, build `ConversationConfigOverride`, pass to `initiatePhoneCall(agentId, phoneNumber, override)`.

4. **UI:** Add voice/language customization for each AI Team member.

## References

- [ElevenLabs Overrides](https://elevenlabs.io/docs/agents-platform/customization/personalization/overrides)
- [Language configuration](https://elevenlabs.io/docs/conversational-ai/customization/language)
- [Voice customization](https://elevenlabs.io/docs/conversational-ai/customization/voice)
