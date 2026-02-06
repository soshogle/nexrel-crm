/**
 * Server-side translation utility
 * Loads translation files and provides translated strings for API routes
 */

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// Import translation files
import enMessages from '@/messages/en.json';
import frMessages from '@/messages/fr.json';
import esMessages from '@/messages/es.json';
import zhMessages from '@/messages/zh.json';

type Locale = 'en' | 'fr' | 'es' | 'zh';

const messages: Record<Locale, any> = {
  en: enMessages,
  fr: frMessages,
  es: esMessages,
  zh: zhMessages,
};

/**
 * Get user's language preference from database
 * Falls back to 'en' if user not found or language not set
 */
async function getUserLanguage(userId: string): Promise<Locale> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { language: true },
    });

    const lang = user?.language || 'en';
    if (['en', 'fr', 'es', 'zh'].includes(lang)) {
      return lang as Locale;
    }
  } catch (error) {
    console.error('Error fetching user language:', error);
  }

  return 'en';
}

/**
 * Get translated string from nested key path
 * Example: getNestedValue(messages.en, 'dental.api.unauthorized')
 */
function getNestedValue(obj: any, path: string): string | undefined {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

/**
 * Translate a key path for a given locale
 * Falls back to English if translation not found
 */
export function translate(locale: Locale, key: string, fallback?: string): string {
  const translation = getNestedValue(messages[locale], key);
  if (translation) return translation;

  // Fallback to English
  const enTranslation = getNestedValue(messages.en, key);
  if (enTranslation) return enTranslation;

  // Fallback to provided fallback or key itself
  return fallback || key;
}

/**
 * Get translated string for current user's language
 * Automatically fetches user's language preference from session
 */
export async function t(key: string, fallback?: string): Promise<string> {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    if (!userId) {
      // No session, use English
      return translate('en', key, fallback);
    }

    const locale = await getUserLanguage(userId);
    return translate(locale, key, fallback);
  } catch (error) {
    console.error('Error in translation:', error);
    return fallback || key;
  }
}

/**
 * Get translated string for a specific user ID
 * Useful when you have a userId but not a session
 */
export async function tForUser(userId: string, key: string, fallback?: string): Promise<string> {
  try {
    const locale = await getUserLanguage(userId);
    return translate(locale, key, fallback);
  } catch (error) {
    console.error('Error in translation:', error);
    return fallback || key;
  }
}
