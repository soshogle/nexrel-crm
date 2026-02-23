'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

/**
 * Legacy booking page - redirects to the unified industry-aware booking page.
 * Kept for backward compatibility with existing shared links.
 */
export default function LegacyBookingRedirect() {
  const params = useParams();
  const router = useRouter();
  const userId = params.userId as string;

  useEffect(() => {
    router.replace(`/booking/${userId}`);
  }, [userId, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-muted-foreground">Redirecting to booking page...</p>
    </div>
  );
}
