import { ReactNode } from 'react';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';

export default async function OnboardingLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions);
  // When onboarding is completed, only admin or super admin can access
  if (session?.user && session.user.onboardingCompleted) {
    const isAdmin = session.user.role === 'ADMIN' || session.user.role === 'BUSINESS_OWNER';
    const isSuperAdmin = session.user.role === 'SUPER_ADMIN' || session.user?.isImpersonating;
    if (!isAdmin && !isSuperAdmin) {
      redirect('/dashboard');
    }
  }
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      {children}
    </div>
  );
}
