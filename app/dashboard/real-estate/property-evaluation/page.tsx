'use client';

import { PropertyEvaluationPanel } from '@/components/real-estate/property-evaluation-panel';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

export default function PropertyEvaluationPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/real-estate"
          className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Real Estate Hub
        </Link>
      </div>
      <PropertyEvaluationPanel />
    </div>
  );
}
