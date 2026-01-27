'use client';

import { SessionProvider } from 'next-auth/react';
import OnboardingClientWrapper from '@/components/onboarding/onboarding-client-wrapper';

export default function OnboardingPage() {
  return (
    <SessionProvider>
      <OnboardingClientWrapper />
    </SessionProvider>
  );
}
