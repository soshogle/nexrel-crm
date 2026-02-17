# Website Voice AI Setup

Owner websites (SERVICE and PRODUCT templates) support two voice AI options:

1. **ElevenLabs Voice AI** — Same experience as nexrel.soshogle.com landing page. Voice-only, floating bubble.
2. **Tavus AI Avatar** — Video avatar (Abacus-style). Can be enabled/disabled per website.

Both can be toggled in the **Website Builder** when creating or editing a website.

## CRM Configuration

### Environment Variables (nexrel-crm)

| Variable | Description |
|----------|-------------|
| `ELEVENLABS_API_KEY` | Required for creating agents and signed URLs |
| `WEBSITE_VOICE_CONFIG_SECRET` | Shared secret for template servers to fetch voice config |
| `WEBSITE_VOICE_LEAD_SECRET` | Shared secret for template→CRM lead webhook |

### Website Builder

- **Enable Voice AI Assistant** — Creates ElevenLabs agent per website with owner-specific prompt
- **Enable AI Avatar** — Shows/hides Tavus video avatar on the deployed site

## Template Configuration

When an owner deploys a template (nexrel-service-template or nexrel-ecommerce-template) linked to a Website record:

| Variable | Description |
|----------|-------------|
| `NEXREL_CRM_URL` | CRM base URL (e.g. https://www.nexrel.soshogle.com) |
| `NEXREL_WEBSITE_ID` | Website ID from the builder |
| `WEBSITE_VOICE_CONFIG_SECRET` | Same as CRM |
| `WEBSITE_VOICE_LEAD_SECRET` | Same as CRM |
| `TAVUS_API_KEY`, `TAVUS_REPLICA_ID`, `TAVUS_PERSONA_ID` | For avatar (optional) |
| `NEXREL_ENABLE_TAVUS_AVATAR` | `false` to disable avatar (env override) |

When `NEXREL_CRM_URL` and `NEXREL_WEBSITE_ID` are set, the template fetches voice config from the CRM. Otherwise it falls back to env vars (`NEXREL_ELEVENLABS_AGENT_ID`, etc.).

**If the voice bubble doesn't show:** See `nexrel-service-template/docs/ELEVENLABS_VOICE_AI_SETUP.md` for a checklist. Common causes: missing env vars in Vercel, Website not linked, or Voice AI not enabled on the Website record.

## Owner-Customizable Voice AI Prompt (Automatic)

Each owner can customize the Voice AI behavior for their business:

1. In **Website Builder** → open **Website Settings** (gear icon)
2. Under **Voice & Avatar**, find **Voice AI Custom Prompt**
3. Enter instructions for how the assistant should greet visitors, describe your agency, and handle requests
4. **Automatic sync:** When saved, the CRM immediately updates the ElevenLabs agent's system prompt via API. No manual setup in the ElevenLabs dashboard is required.

The owner's text is appended to a base prompt and synced to the agent. Leave blank to use the default assistant behavior.

## Workflow & Campaign Triggers

Voice AI leads trigger:

- **Workflow Builder** — Use **Website Voice AI Lead** as an enrollment trigger. When a visitor provides contact info via Voice AI, they are auto-enrolled in matching workflows.
- **Campaign Builder** — Use **When Website Voice AI Captures Lead** as the trigger type for email/SMS drip campaigns.
- **Real Estate Workflows** — Buyer/seller workflows continue to run for Voice AI leads when industry is REAL_ESTATE.

## CRM Integration

Voice AI conversations push to the CRM:

- **Leads** — Created with source "Website Voice AI"
- **Notes** — Transcript attached to the lead
- **Appointments** — If the agent captures booking intent
- **Workflows** — Real estate workflows triggered for new leads
- **Drip Campaigns** — Auto-enrollment in campaigns with WEBSITE_VOICE_AI_LEAD trigger

Webhook: `POST /api/webhooks/website-voice-lead` (called by template, which proxies to CRM)
