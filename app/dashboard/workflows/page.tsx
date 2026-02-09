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
import { getIndustryConfig } from '@/lib/workflows/industry-configs';

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
    return <REWorkflowsTab />;
  }

  // Check for industry-specific workflow tabs
  if (userIndustry === 'MEDICAL') {
    return <MedicalWorkflowsTab />;
  }
  if (userIndustry === 'RESTAURANT') {
    return <RestaurantWorkflowsTab />;
  }
  if (userIndustry === 'CONSTRUCTION') {
    return <ConstructionWorkflowsTab />;
  }
  if (userIndustry === 'DENTIST') {
    return <DentistWorkflowsTab />;
  }
  if (userIndustry === 'MEDICAL_SPA') {
    return <MedicalSpaWorkflowsTab />;
  }
  if (userIndustry === 'OPTOMETRIST') {
    return <OptometristWorkflowsTab />;
  }
  if (userIndustry === 'HEALTH_CLINIC') {
    return <HealthClinicWorkflowsTab />;
  }
  if (userIndustry === 'HOSPITAL') {
    return <HospitalWorkflowsTab />;
  }
  if (userIndustry === 'TECHNOLOGY') {
    return <TechnologyWorkflowsTab />;
  }
  if (userIndustry === 'SPORTS_CLUB') {
    return <SportsClubWorkflowsTab />;
  }

  // Default to generic industry workflow tab
  return <IndustryWorkflowsTab industry={userIndustry} />;
}
