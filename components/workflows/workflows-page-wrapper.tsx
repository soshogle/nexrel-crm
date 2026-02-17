'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

interface WorkflowsPageWrapperProps {
  children: React.ReactNode;
}

export function WorkflowsPageWrapper({ children }: WorkflowsPageWrapperProps) {
  return (
    <div className="container mx-auto p-6 space-y-4">
      <Button variant="ghost" asChild className="mb-2">
        <Link href="/dashboard">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Link>
      </Button>
      {children}
    </div>
  );
}
