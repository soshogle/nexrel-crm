export const dynamic = 'force-dynamic';


import { Metadata } from 'next';
import { CreditScoreCard } from '@/components/credit-scoring/credit-score-card';
import { CreditApplicationForm } from '@/components/credit-scoring/credit-application-form';

export const metadata: Metadata = {
  title: 'Credit Scoring | Soshogle CRM',
  description: 'View your AI Trust Score and manage credit applications',
};

export default function CreditScoringPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Credit Scoring</h2>
        <p className="text-muted-foreground">
          AI-powered credit assessment and application management
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <CreditScoreCard />
        <CreditApplicationForm />
      </div>
    </div>
  );
}
