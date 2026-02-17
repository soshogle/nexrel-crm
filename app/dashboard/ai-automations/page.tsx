'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * AI Automations page removed - redirect to Workflows
 */
export default function AIAutomationsRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard/workflows');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[200px]">
      <p className="text-muted-foreground">Redirecting to Workflows...</p>
    </div>
  );
}
