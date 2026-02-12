/**
 * Landing page language support for voice agent.
 * Maps LanguageSwitcher selection to preferred_language dynamic variable.
 * The ElevenLabs agent prompt should include:
 * "If {{preferred_language}} is provided, respond in that language.
 *  Otherwise, if the user speaks in another language, respond in that language.
 *  You are fluent in all languages supported by ElevenLabs."
 */

export const LANDING_LANG_MAP: Record<string, string> = {
  en: "English",
  es: "Spanish",
  fr: "French",
  de: "German",
  zh: "Chinese",
  ar: "Arabic",
};

export const LANDING_LANGUAGE_PROMPT = `
## Language Handling
You are fluent in all languages supported by ElevenLabs. If the user has selected a preferred language ({{preferred_language}}), use that language. Otherwise, if the user speaks to you in another language (French, Spanish, Chinese, Arabic, etc.), respond in that same language immediately.
`;
