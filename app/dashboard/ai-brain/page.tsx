import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { AIBrainDashboard } from '@/components/ai-brain/ai-brain-dashboard';

export const dynamic = 'force-dynamic';

export default async function AIBrainPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect('/login');
  }

  return (
    <div className="space-y-6">
      <AIBrainDashboard />
    </div>
  );
}
