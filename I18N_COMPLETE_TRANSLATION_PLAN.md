# Complete Internationalization (i18n) Implementation Plan

## Goal
Ensure 100% translation coverage - when a user selects Spanish, French, or Chinese, **ALL** content in the app must be in that language with **ZERO** English words appearing anywhere.

## Current Status

### ✅ What's Already Working
1. User language preference is stored in database (`user.language`)
2. Translation files exist for: `en`, `fr`, `es`, `zh`
3. Navigation menu translations are mostly complete
4. Some toast messages are translated
5. Docpen voice agent respects user language
6. Some AI-generated content includes language instructions

### ❌ What Needs to Be Fixed

#### 1. AI-Generated Content
- **AI Assistant Chat** (`/app/api/ai-assistant/chat/route.ts`)
  - ✅ FIXED: Added language instructions to system prompt
  - System prompt still has English hardcoded text
  - Need to translate system prompt based on user language
  
- **Campaign Generation** (`/app/api/campaigns/ai-generate/route.ts`)
  - Need to add user language preference
  - Ensure AI generates content in user's language
  
- **Message Generation** (`/app/api/messages/generate/route.ts`)
  - Need to check language preference
  - Ensure responses are in user's language
  
- **Workflow Generation** (`/lib/ai-workflow-generator.ts`)
  - Need to add language support
  
- **SOAP Note Generation** (`/lib/docpen/soap-generator.ts`)
  - Already has language support via prompts
  - Verify it's using user language

#### 2. Hardcoded English Strings in Components
- **Toast Messages**: Many components use hardcoded English strings
  - ✅ FIXED: `components/docpen/soap-note-editor.tsx`
  - Need to fix: All other components with `toast.success()`, `toast.error()`
  
- **Button Labels**: Some buttons have hardcoded text
- **Form Labels**: Some forms have hardcoded English
- **Error Messages**: API error responses need translation
- **Success Messages**: API success responses need translation

#### 3. Missing Translation Keys
- Check `messages/fr.json`, `messages/es.json`, `messages/zh.json`
- Ensure all keys from `messages/en.json` exist in other languages
- Add missing translations

#### 4. API Response Messages
- Error messages in API routes need translation
- Success messages in API routes need translation
- Need to pass user language to API routes

## Implementation Steps

### Step 1: Update AI System Prompts (IN PROGRESS)
- [x] Add language instructions to AI Assistant Chat
- [ ] Translate system prompt content based on user language
- [ ] Update campaign generation to use user language
- [ ] Update message generation to use user language
- [ ] Update workflow generation to use user language

### Step 2: Fix Hardcoded Strings in Components
- [x] Fix SOAP note editor toast messages
- [ ] Find all `toast.success()` and `toast.error()` calls
- [ ] Replace with translation keys
- [ ] Fix button labels
- [ ] Fix form labels
- [ ] Fix error messages

### Step 3: Complete Translation Files
- [ ] Audit `messages/en.json` for completeness
- [ ] Ensure all keys exist in `fr.json`, `es.json`, `zh.json`
- [ ] Add missing translations
- [ ] Verify translation quality

### Step 4: API Route Updates
- [ ] Add language parameter to API routes that generate content
- [ ] Translate error messages in API responses
- [ ] Translate success messages in API responses
- [ ] Ensure API routes can access user language

### Step 5: Testing
- [ ] Test with Spanish user - verify NO English appears
- [ ] Test with French user - verify NO English appears
- [ ] Test with Chinese user - verify NO English appears
- [ ] Test AI-generated content in each language
- [ ] Test all UI components in each language

## Critical Files to Update

### High Priority
1. `/app/api/ai-assistant/chat/route.ts` - Main AI assistant
2. `/app/api/campaigns/ai-generate/route.ts` - Campaign generation
3. `/app/api/messages/generate/route.ts` - Message generation
4. `/lib/ai-workflow-generator.ts` - Workflow generation
5. All components with toast messages

### Medium Priority
1. Form components with hardcoded labels
2. Error handling components
3. Success message components
4. API error responses

### Low Priority
1. Console log messages (can stay in English)
2. Developer-facing error messages
3. Internal system messages

## Language Instruction Templates

### English
```
CRITICAL: You MUST respond ONLY in English. Every single word, sentence, and response must be in English. Never use any other language.
```

### French
```
CRITIQUE : Vous DEVEZ répondre UNIQUEMENT en français. Chaque mot, phrase et réponse doit être en français. N'utilisez jamais une autre langue.
```

### Spanish
```
CRÍTICO: DEBES responder SOLO en español. Cada palabra, frase y respuesta debe estar en español. Nunca uses otro idioma.
```

### Chinese
```
关键：您必须仅用中文回复。每个词、句子和回复都必须是中文。永远不要使用其他语言。
```

## Notes
- User language is stored in `user.language` field in database
- Supported languages: `en`, `fr`, `es`, `zh`
- Default language: `en`
- Language preference is fetched via `/api/user/language`
- Translation system uses `next-intl` library
