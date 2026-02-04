
'use client';

import { useEffect, useState } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import { useSession } from 'next-auth/react';

// Import all message files
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

export function IntlProviderWrapper({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession() || {};
  const [locale, setLocale] = useState<Locale>('en');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUserLanguage = async () => {
      // If user is not authenticated, use default language
      if (status === 'unauthenticated' || !session?.user) {
        setLocale('en');
        setIsLoading(false);
        return;
      }

      // If user is authenticated, fetch their language preference
      if (status === 'authenticated' && session?.user) {
        try {
          const response = await fetch('/api/user/language');
          if (response.ok) {
            const data = await response.json();
            const userLanguage = data.language || 'en';
            if (['en', 'fr', 'es', 'zh'].includes(userLanguage)) {
              setLocale(userLanguage as Locale);
            }
          }
        } catch (error) {
          console.error('Error fetching user language:', error);
          // Default to English on error
          setLocale('en');
        } finally {
          setIsLoading(false);
        }
      }
    };

    if (status !== 'loading') {
      fetchUserLanguage();
    }
  }, [session, status]);

  // Always provide IntlProvider, even during loading, to prevent hook errors
  // Use default locale and messages if still loading
  const currentLocale = isLoading ? 'en' : locale;
  const currentMessages = isLoading ? messages.en : messages[locale];

  return (
    <NextIntlClientProvider locale={currentLocale} messages={currentMessages}>
      {children}
    </NextIntlClientProvider>
  );
}
