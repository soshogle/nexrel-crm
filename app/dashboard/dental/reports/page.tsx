'use client';

import { ClinicProvider, useClinic } from '@/lib/dental/clinic-context';
import { SharedDashboardLayout } from '@/components/dental/shared-dashboard-layout';
import { ProductionReportDashboard } from '@/components/dental/production-report-dashboard';

function ReportsContent() {
  const { activeClinic } = useClinic();

  return (
    <SharedDashboardLayout role="admin">
      <div className="p-6">
        <ProductionReportDashboard clinicId={activeClinic?.id} />
      </div>
    </SharedDashboardLayout>
  );
}

export default function DentalReportsPage() {
  return (
    <ClinicProvider>
      <ReportsContent />
    </ClinicProvider>
  );
}
