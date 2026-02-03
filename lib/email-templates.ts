/**
 * Email Template Helper
 * Provides translated email templates based on user language preference
 */

import enMessages from '@/messages/en.json';
import frMessages from '@/messages/fr.json';
import esMessages from '@/messages/es.json';
import zhMessages from '@/messages/zh.json';

const messages = {
  en: enMessages,
  fr: frMessages,
  es: esMessages,
  zh: zhMessages,
};

type Locale = 'en' | 'fr' | 'es' | 'zh';

/**
 * Get email template translations for a specific language
 */
export function getEmailTemplates(locale: Locale = 'en') {
  const localeMessages = messages[locale] || messages.en;
  return localeMessages.emails || messages.en.emails;
}

/**
 * Replace placeholders in email template strings
 */
export function replaceEmailPlaceholders(
  template: string,
  replacements: Record<string, string>
): string {
  let result = template;
  for (const [key, value] of Object.entries(replacements)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
  }
  return result;
}

/**
 * Format date according to locale
 */
export function formatDateForLocale(date: Date, locale: Locale = 'en'): string {
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  };

  const localeMap: Record<Locale, string> = {
    en: 'en-US',
    fr: 'fr-FR',
    es: 'es-ES',
    zh: 'zh-CN',
  };

  return date.toLocaleDateString(localeMap[locale] || 'en-US', options);
}
