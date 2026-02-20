'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Check, X } from 'lucide-react';
import { toast } from 'sonner';
interface ApprovalTabProps {
  websiteId: string;
  websiteStructure: any;
  pendingChanges: any[];
  setPendingChanges: (changes: any[]) => void;
  fetchWebsite: () => Promise<void>;
}

export function ApprovalTab({
  websiteId,
  websiteStructure,
  pendingChanges,
  setPendingChanges,
  fetchWebsite,
}: ApprovalTabProps) {
  const handleApprove = async (approvalId: string) => {
    try {
      const response = await fetch('/api/website-builder/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          websiteId,
          approvalId,
          action: 'approve',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to approve changes');
      }

      toast.success('Changes approved and applied!');
      setPendingChanges(pendingChanges.filter(c => c.id !== approvalId));
      fetchWebsite();
    } catch (error: any) {
      toast.error(error.message || 'Failed to approve changes');
    }
  };

  const handleReject = async (approvalId: string) => {
    try {
      const response = await fetch('/api/website-builder/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          websiteId,
          approvalId,
          action: 'reject',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to reject changes');
      }

      toast.success('Changes rejected');
      setPendingChanges(pendingChanges.filter(c => c.id !== approvalId));
    } catch (error: any) {
      toast.error(error.message || 'Failed to reject changes');
    }
  };

  return (
    <>
      {pendingChanges.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Check className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Pending Changes</h3>
            <p className="text-muted-foreground">
              Use the AI Chat tab to request modifications
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {pendingChanges.map((change) => (
            <Card key={change.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Pending Changes</span>
                  <Badge variant="outline">{change.status}</Badge>
                </CardTitle>
                <CardDescription>
                  Created {new Date(change.createdAt).toLocaleString()}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {change.explanation && (
                  <Alert>
                    <AlertDescription>
                      <strong>AI Explanation:</strong> {change.explanation}
                    </AlertDescription>
                  </Alert>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold mb-2">Current</h4>
                    <div className="bg-muted p-4 rounded-lg">
                      <pre className="text-xs overflow-auto">
                        {JSON.stringify(websiteStructure, null, 2).substring(0, 500)}...
                      </pre>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Preview</h4>
                    <div className="bg-muted p-4 rounded-lg">
                      <pre className="text-xs overflow-auto">
                        {JSON.stringify(change.preview, null, 2).substring(0, 500)}...
                      </pre>
                    </div>
                  </div>
                </div>
                {change.changes && change.changes.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Changes Summary</h4>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      {change.changes.map((ch: any, idx: number) => (
                        <li key={idx}>
                          <strong>{ch.type}:</strong> {ch.description || ch.path}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => handleApprove(change.id)}
                    className="flex-1"
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Approve
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleReject(change.id)}
                    className="flex-1"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
