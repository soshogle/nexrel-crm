# Migration Plan: Abacus AI → OpenAI Direct

## Overview
This document outlines the safe migration from Abacus AI RouteLLM to OpenAI Direct API.

## Why Migrate?
- **Cost Savings**: No $10/month subscription fee
- **Volume Discounts**: Better pricing at scale for multi-tenant SaaS
- **Direct Control**: No middleman, predictable costs
- **Same Functionality**: OpenAI-compatible API format

## Migration Strategy

### Phase 1: Add OpenAI Support (Backward Compatible)
1. Add `OPENAI_API_KEY` environment variable support
2. Create a configurable API client that supports both providers
3. Add feature flag to switch between providers
4. Test with OpenAI while keeping Abacus as fallback

### Phase 2: Switch Default to OpenAI
1. Update all endpoints to use OpenAI by default
2. Keep Abacus as fallback option
3. Monitor usage and costs

### Phase 3: Remove Abacus (Optional)
1. Once confident, remove Abacus AI code
2. Simplify to OpenAI-only

## Files That Need Changes

### Transcription (1 file)
- `lib/docpen/transcription-service.ts`
  - Change: `routellm.abacus.ai/v1/audio/transcriptions` → `api.openai.com/v1/audio/transcriptions`

### Chat Completions (15+ files)
- `lib/docpen/soap-generator.ts`
- `lib/docpen/assistant-service.ts`
- `lib/ai-response-service.ts`
- `lib/workflow-engine.ts`
- `lib/voice-conversation.ts`
- `lib/ai-employees/lead-researcher.ts`
- `lib/ai-campaign-generator.ts`
- `lib/conversation-intelligence.ts`
- `app/api/ai-assistant/chat/route.ts`
- `app/api/messages/generate/route.ts`
- `app/api/real-estate/stale-diagnostic/analyze/route.ts`
- `app/api/real-estate/market-reports/generate/route.ts`
- `app/api/real-estate/attraction/seller-report/route.ts`
- `app/api/real-estate/attraction/buyer-report/route.ts`
- `app/api/onboarding/process-intent/route.ts`
- `app/api/workflows/customize-template/route.ts`

### Special Cases (2 files)
- `app/api/real-estate/net-sheet/pdf/route.ts` - Uses Abacus PDF service (may need alternative)
- `app/api/docpen/voice-agent/functions/route.ts` - Uses OpenAI SDK (just change baseURL)

## Model Name Mapping

Some Abacus-specific models need mapping:
- `gpt-4.1-mini` → `gpt-4o-mini` (OpenAI equivalent)
- `gpt-4o` → `gpt-4o` (same)
- `gpt-4o-mini` → `gpt-4o-mini` (same)
- `whisper-1` → `whisper-1` (same)

## Testing Checklist

After migration:
- [ ] Docpen transcription works
- [ ] Docpen SOAP note generation works
- [ ] AI chat assistant works
- [ ] Real estate reports generate correctly
- [ ] Voice agent AI responses work
- [ ] All workflow AI features work
- [ ] Error handling works correctly
- [ ] Usage tracking still works

## Rollback Plan

If issues occur:
1. Revert to `ABACUSAI_API_KEY` in environment variables
2. Git revert the code changes
3. Redeploy

## Estimated Savings

For 100 tenants using moderate AI:
- **Current (Abacus)**: $10/month + usage = ~$130/month
- **After Migration (OpenAI)**: $0/month + usage = ~$120/month
- **Savings**: $10/month + better volume discounts at scale

## Next Steps

1. Review this plan
2. Get OpenAI API key ready
3. Implement changes in development branch
4. Test thoroughly
5. Deploy to production
