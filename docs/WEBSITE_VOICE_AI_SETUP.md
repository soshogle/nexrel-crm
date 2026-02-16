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

## CRM Integration

Voice AI conversations push to the CRM:

- **Leads** — Created with source "Website Voice AI"
- **Notes** — Transcript attached to the lead
- **Appointments** — If the agent captures booking intent
- **Workflows** — Real estate workflows triggered for new leads

Webhook: `POST /api/webhooks/website-voice-lead` (called by template, which proxies to CRM)
