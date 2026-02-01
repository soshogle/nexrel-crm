'use client';

export const dynamic = 'force-dynamic';

import { FSBOLeadsFull } from '@/components/real-estate/fsbo-leads-full';

export default function FSBOLeadsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
      <div className="max-w-7xl mx-auto">
        <FSBOLeadsFull />
      </div>
    </div>
  );
}
