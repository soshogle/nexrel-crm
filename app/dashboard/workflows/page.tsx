export const dynamic = 'force-dynamic';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getWorkflowTabForIndustry, isIndustryFallbackTab } from '@/lib/industry-registry';
import type { Industry } from '@/lib/industry-menu-config';
import { WorkflowsPageWrapper } from '@/components/workflows/workflows-page-wrapper';

export default async function WorkflowsPageRoute() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return <div>Unauthorized</div>;
  }

  // Get user's industry (from DB - session may not have it on first load)
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { industry: true },
  });

  const userIndustry = (user?.industry as Industry) ?? null;

  if (!userIndustry) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-600">Please select your industry first</p>
      </div>
    );
  }

  const TabComponent = getWorkflowTabForIndustry(userIndustry);

  return (
    <WorkflowsPageWrapper>
      {isIndustryFallbackTab(TabComponent) ? (
        <TabComponent industry={userIndustry} />
      ) : (
        <TabComponent />
      )}
    </WorkflowsPageWrapper>
  );
}
