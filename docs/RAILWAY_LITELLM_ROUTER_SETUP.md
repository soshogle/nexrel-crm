# Railway LiteLLM Router Setup

This guide deploys LiteLLM on Railway and connects this CRM so OpenAI is primary and fallback providers are used only when needed.

## Cost Overview

- LiteLLM software (open source): free.
- Railway hosting: typically low monthly cost for a small service, then scales with traffic.
- Model usage: billed by each provider (OpenAI, Anthropic, Gemini, etc.).

## Behavior Target

- Normal state: requests go to OpenAI (primary path).
- Outage/rate-limit state: LiteLLM retries and routes to configured backup providers.
- Recovery state: once OpenAI is healthy, traffic returns to OpenAI automatically.

## 1) Deploy LiteLLM on Railway

1. Create a new Railway project.
2. Add a new service using the official LiteLLM container image.
3. Expose service port `4000`.
4. Add required environment variables:
   - `OPENAI_API_KEY`
   - `ANTHROPIC_API_KEY` (recommended backup)
   - `GEMINI_API_KEY` (optional backup)
   - `LITELLM_MASTER_KEY` (required; your gateway auth key)
5. Add config file content based on `ops/litellm/config.example.yaml`.
6. Deploy and verify LiteLLM health endpoint responds.

## 2) Configure CRM to use Railway LiteLLM

Set these environment variables in Vercel (per environment):

- `OPENAI_API_BASE_URL=https://<your-railway-domain>/v1`
- `LITELLM_BASE_URL=https://<your-railway-domain>/v1` (optional alias)
- `LITELLM_API_KEY=<your LITELLM_MASTER_KEY>`

Important:

- Keep `OPENAI_API_KEY` in Vercel for direct fallback compatibility and legacy code paths.
- `LITELLM_API_KEY` is preferred by `lib/openai-client.ts` when routed mode is enabled.

## 3) Routing policy for cheapest -> most expensive

Define model aliases in LiteLLM and stack providers by preference:

- `fast_chat`: cheapest first, then medium backup.
- `smart_chat`: balanced first, premium backup.

Use whichever provider order matches your cost policy. LiteLLM will apply retries/fallback automatically when a target fails.

## 4) Automatic failback to OpenAI

LiteLLM router settings support failure thresholds and cooldown behavior.
When OpenAI starts passing health checks again, it re-enters routing and receives traffic without manual intervention.

## 5) Validation checklist

1. Send a normal request and confirm it routes through Railway LiteLLM.
2. Temporarily simulate OpenAI failure in LiteLLM config.
3. Confirm request succeeds through Anthropic/Gemini fallback.
4. Restore OpenAI and confirm requests return to OpenAI.
5. Monitor latency and token spend before/after.

## Notes for this repository

`lib/openai-client.ts` now supports routed mode via:

- `OPENAI_API_BASE_URL` or `LITELLM_BASE_URL` for endpoint base URL.
- `LITELLM_API_KEY` (preferred) or `OPENAI_API_KEY` for auth when routed.

If no custom base URL is set, behavior remains direct OpenAI.
