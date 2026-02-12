# Voice Agent Language Configuration

## Landing Page

The landing page (soshogle.com) uses ElevenLabs Conversational AI agents for the hero demo and AI Staff section. These agents are configured in the ElevenLabs dashboard.

## Agent IDs

| Env Variable | Usage |
|--------------|-------|
| `NEXT_PUBLIC_ELEVENLABS_DEMO_AGENT_ID` | Hero demo button, Try Demo modal |
| `NEXT_PUBLIC_ELEVENLABS_HOME_AGENT_ID` | AI Staff section |

## Language Switching

The landing page has a **Language Switcher** (globe icon) that lets users select: English, Spanish, French, German, Chinese, Arabic. The selected language is passed to the voice agent as the `preferred_language` dynamic variable.

### ElevenLabs Agent Prompt

Add this to your agent's **system prompt** in the ElevenLabs dashboard so it responds in the user's language:

```
## Language Handling
You are fluent in all languages supported by ElevenLabs. If the user has selected a preferred language ({{preferred_language}}), use that language. Otherwise, if the user speaks to you in another language (French, Spanish, Chinese, Arabic, etc.), respond in that same language immediately.
```

### Dynamic Variables Passed

| Variable | Description |
|----------|-------------|
| `preferred_language` | From Language Switcher (e.g. "English", "Spanish", "French") |
| `company_name` | "Soshogle" or form value in demo |
| `website_url` | https://www.soshogle.com or form value |
| `user_name` | "Visitor" or form full name |
| `industry` | "Technology" or form value |

## Code References

- `lib/landing-language.ts` – language map and prompt reference
- `hooks/use-landing-language.ts` – reads selected language, listens for changes
- `components/landing/soshogle/language-switcher.tsx` – dispatches `soshogle:language-change` on change
- `components/landing/soshogle/elevenlabs-agent.tsx` – passes `dynamicVariables` to `Conversation.startSession`

---

## Workflow & Campaign Task Language

When an AI employee is assigned to a voice call task in a workflow or campaign, the user can override the call language per task.

### Task Editor

- **Generic workflows** (`components/workflows/task-editor-panel.tsx`): When "Voice Call" is selected and an AI agent is assigned, a "Voice Call Language" card appears with a dropdown.
- **Real Estate workflows** (`components/real-estate/workflows/task-editor-panel.tsx`): Same behavior.

### Priority (highest first)

1. **Task `actionConfig.voiceLanguage`** – Per-task override set in the task editor
2. **AI employee `voiceConfig.language`** – Set in AI Employees page → Voice customization
3. **User `language`** – From user profile (Account settings)
4. **Default** – English (`en`)

### Code References

- `lib/voice-languages.ts` – shared `VOICE_LANGUAGES` list
- `lib/workflows/workflow-task-executor.ts` – applies `voiceLanguage` override when executing voice calls
- `lib/real-estate/workflow-task-executor.ts` – same for RE workflows
