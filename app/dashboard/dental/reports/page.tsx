'use client';

import { ClinicProvider, useClinic } from '@/lib/dental/clinic-context';
import { ProductionReportDashboard } from '@/components/dental/production-report-dashboard';

function ReportsContent() {
  const { activeClinic } = useClinic();

  return (
    <div className="min-h-screen bg-gradient-to-r from-purple-900 via-purple-700 to-purple-500">
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">Production Reports</h1>
          <p className="text-white/70 text-sm">Revenue, patients, and practice analytics</p>
        </div>
        <ProductionReportDashboard clinicId={activeClinic?.id} />
      </div>
    </div>
  );
}

export default function DentalReportsPage() {
  return (
    <ClinicProvider>
      <ReportsContent />
    </ClinicProvider>
  );
}
