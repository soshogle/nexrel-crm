/**
 * Canonical voice/agent language options for ElevenLabs and CRM agents.
 * Single source of truth - used by: voice agents, task editor, AI employees, landing page.
 * All agents share the same multilingual capabilities.
 */

/** Single language option */
export interface VoiceLanguageOption {
  value: string;
  label: string;
}

/**
 * Full language list - matches ElevenLabs supported languages and voice AI agent setup.
 * Used for: task editor per-task override, AI employee voice config.
 */
export const VOICE_LANGUAGES: VoiceLanguageOption[] = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'it', label: 'Italian' },
  { value: 'pt', label: 'Portuguese (European)' },
  { value: 'pt-BR', label: 'Portuguese (Brazilian)' },
  { value: 'zh', label: 'Chinese (Mandarin)' },
  { value: 'ja', label: 'Japanese' },
  { value: 'ko', label: 'Korean' },
  { value: 'ar', label: 'Arabic' },
  { value: 'ru', label: 'Russian' },
  { value: 'hi', label: 'Hindi' },
  { value: 'nl', label: 'Dutch' },
  { value: 'pl', label: 'Polish' },
  { value: 'tr', label: 'Turkish' },
  { value: 'vi', label: 'Vietnamese' },
  { value: 'id', label: 'Indonesian' },
  { value: 'ms', label: 'Malay' },
  { value: 'sv', label: 'Swedish' },
  { value: 'da', label: 'Danish' },
  { value: 'no', label: 'Norwegian' },
  { value: 'fi', label: 'Finnish' },
  { value: 'el', label: 'Greek' },
  { value: 'ro', label: 'Romanian' },
  { value: 'hu', label: 'Hungarian' },
  { value: 'cs', label: 'Czech' },
  { value: 'sk', label: 'Slovak' },
  { value: 'bg', label: 'Bulgarian' },
  { value: 'hr', label: 'Croatian' },
  { value: 'uk', label: 'Ukrainian' },
  { value: 'fil', label: 'Filipino' },
  { value: 'ta', label: 'Tamil' },
  { value: 'multilingual', label: 'Multilingual' },
];

/**
 * Voice agent languages - includes special options (all, none) for full agent config.
 * Used by: create/edit voice agent dialogs.
 */
export const VOICE_AGENT_LANGUAGES: VoiceLanguageOption[] = [
  { value: 'all', label: 'All Languages (Multilingual)' },
  { value: 'none', label: 'None (Language Detection)' },
  ...VOICE_LANGUAGES.filter((l) => l.value !== 'multilingual'),
];

/**
 * Landing page language switcher - subset for hero demo.
 * Maps to LANDING_LANG_MAP for preferred_language dynamic variable.
 */
export const LANDING_LANGUAGES: VoiceLanguageOption[] = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'zh', label: 'Chinese' },
  { value: 'ar', label: 'Arabic' },
];

/** Legacy: map code to display name for landing page */
export const LANDING_LANG_MAP: Record<string, string> = Object.fromEntries(
  LANDING_LANGUAGES.map((l) => [l.value, l.label])
);

/** Language handling prompt for ElevenLabs agents - multilingual support */
export const LANGUAGE_PROMPT_SECTION = `
## Language Handling
You are fluent in all languages supported by ElevenLabs. If the user has selected a preferred language ({{preferred_language}}), use that language. Otherwise, if the user speaks to you in another language (French, Spanish, Chinese, Arabic, etc.), respond in that same language immediately.
`;

/** Language prompt for agents without preferred_language (e.g. industry AI employees, phone agents) */
export const AGENT_LANGUAGE_PROMPT = `
## Language Handling
You are fluent in all languages supported by ElevenLabs. If the caller speaks in another language, continue the conversation in that language.
`;
