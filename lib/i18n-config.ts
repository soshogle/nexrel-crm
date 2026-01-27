
import { getRequestConfig } from 'next-intl/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// Supported locales
export const locales = ['en', 'fr', 'es', 'zh'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'en';

// Get user's preferred language from database
async function getUserLanguage(): Promise<Locale> {
  try {
    const session = await getServerSession(authOptions);
    
    if (session?.user?.id) {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { language: true },
      });
      
      if (user?.language && locales.includes(user.language as Locale)) {
        return user.language as Locale;
      }
    }
  } catch (error) {
    console.error('Error fetching user language:', error);
  }
  
  return defaultLocale;
}

export default getRequestConfig(async () => {
  // Get the user's preferred language
  const locale = await getUserLanguage();
  
  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
