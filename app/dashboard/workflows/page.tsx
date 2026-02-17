export const dynamic = 'force-dynamic';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { IndustryWorkflowsTab } from '@/components/workflows/industry-workflows-tab';
import { REWorkflowsTab } from '@/components/real-estate/workflows/re-workflows-tab';
import { MedicalWorkflowsTab } from '@/components/medical/workflows/medical-workflows-tab';
import { RestaurantWorkflowsTab } from '@/components/restaurant/workflows/restaurant-workflows-tab';
import { ConstructionWorkflowsTab } from '@/components/construction/workflows/construction-workflows-tab';
import { DentistWorkflowsTab } from '@/components/dentist/workflows/dentist-workflows-tab';
import { MedicalSpaWorkflowsTab } from '@/components/medical-spa/workflows/medical-spa-workflows-tab';
import { OptometristWorkflowsTab } from '@/components/optometrist/workflows/optometrist-workflows-tab';
import { HealthClinicWorkflowsTab } from '@/components/health-clinic/workflows/health-clinic-workflows-tab';
import { HospitalWorkflowsTab } from '@/components/hospital/workflows/hospital-workflows-tab';
import { TechnologyWorkflowsTab } from '@/components/technology/workflows/technology-workflows-tab';
import { SportsClubWorkflowsTab } from '@/components/sports-club/workflows/sports-club-workflows-tab';
import { WorkflowsPageWrapper } from '@/components/workflows/workflows-page-wrapper';

export default async function WorkflowsPageRoute() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return <div>Unauthorized</div>;
  }

  // Get user's industry
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { industry: true },
  });

  const userIndustry = user?.industry;

  if (!userIndustry) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-600">Please select your industry first</p>
      </div>
    );
  }

  // Render appropriate workflow tab based on industry
  if (userIndustry === 'REAL_ESTATE') {
    return (
      <WorkflowsPageWrapper>
        <REWorkflowsTab />
      </WorkflowsPageWrapper>
    );
  }
  if (userIndustry === 'MEDICAL') {
    return (
      <WorkflowsPageWrapper>
        <MedicalWorkflowsTab />
      </WorkflowsPageWrapper>
    );
  }
  if (userIndustry === 'RESTAURANT') {
    return (
      <WorkflowsPageWrapper>
        <RestaurantWorkflowsTab />
      </WorkflowsPageWrapper>
    );
  }
  if (userIndustry === 'CONSTRUCTION') {
    return (
      <WorkflowsPageWrapper>
        <ConstructionWorkflowsTab />
      </WorkflowsPageWrapper>
    );
  }
  if (userIndustry === 'DENTIST') {
    return (
      <WorkflowsPageWrapper>
        <DentistWorkflowsTab />
      </WorkflowsPageWrapper>
    );
  }
  if (userIndustry === 'MEDICAL_SPA') {
    return (
      <WorkflowsPageWrapper>
        <MedicalSpaWorkflowsTab />
      </WorkflowsPageWrapper>
    );
  }
  if (userIndustry === 'OPTOMETRIST') {
    return (
      <WorkflowsPageWrapper>
        <OptometristWorkflowsTab />
      </WorkflowsPageWrapper>
    );
  }
  if (userIndustry === 'HEALTH_CLINIC') {
    return (
      <WorkflowsPageWrapper>
        <HealthClinicWorkflowsTab />
      </WorkflowsPageWrapper>
    );
  }
  if (userIndustry === 'HOSPITAL') {
    return (
      <WorkflowsPageWrapper>
        <HospitalWorkflowsTab />
      </WorkflowsPageWrapper>
    );
  }
  if (userIndustry === 'TECHNOLOGY') {
    return (
      <WorkflowsPageWrapper>
        <TechnologyWorkflowsTab />
      </WorkflowsPageWrapper>
    );
  }
  if (userIndustry === 'SPORTS_CLUB') {
    return (
      <WorkflowsPageWrapper>
        <SportsClubWorkflowsTab />
      </WorkflowsPageWrapper>
    );
  }

  return (
    <WorkflowsPageWrapper>
      <IndustryWorkflowsTab industry={userIndustry} />
    </WorkflowsPageWrapper>
  );
}
