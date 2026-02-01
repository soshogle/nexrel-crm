'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';

export default function Page() {
  const [Component, setComponent] = useState<any>(null);

  useEffect(() => {
    // Only load component on client side
    import('@/components/voice-agents/voice-agents-page').then((mod) => {
      setComponent(() => mod.VoiceAgentsPage);
    });
  }, []);

  if (!Component) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return <Component />;
}
