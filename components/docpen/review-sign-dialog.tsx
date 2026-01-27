'use client';

import { useState } from 'react';
import { FileSignature, AlertTriangle, Check, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { toast } from 'sonner';

interface ReviewSignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string;
  patientName?: string;
  sessionDate: Date;
  onSigned?: () => void;
}

export function ReviewSignDialog({
  open,
  onOpenChange,
  sessionId,
  patientName,
  sessionDate,
  onSigned,
}: ReviewSignDialogProps) {
  const [signedBy, setSignedBy] = useState('');
  const [attestations, setAttestations] = useState({
    reviewed: false,
    accurate: false,
    authorized: false,
  });
  const [isSigning, setIsSigning] = useState(false);

  const allAttestationsChecked = Object.values(attestations).every(Boolean);
  const canSign = signedBy.trim() && allAttestationsChecked;

  const handleSign = async () => {
    if (!canSign) return;

    setIsSigning(true);
    try {
      const attestationText = [
        'I have reviewed the documentation in its entirety.',
        'I attest that the information is accurate to the best of my knowledge.',
        'I am authorized to sign this clinical documentation.',
      ].join(' ');

      const response = await fetch(`/api/docpen/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'sign',
          signedBy,
          attestation: attestationText,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to sign');
      }

      toast.success('Session signed successfully');
      onSigned?.();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to sign session');
    } finally {
      setIsSigning(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSignature className="h-5 w-5" />
            Review & Sign Documentation
          </DialogTitle>
          <DialogDescription>
            Please review the SOAP note carefully before signing. Once signed, the
            documentation becomes part of the permanent medical record.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Session Info */}
          <div className="bg-muted rounded-lg p-3">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Patient:</span>{' '}
                <span className="font-medium">{patientName || 'Not specified'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Date:</span>{' '}
                <span className="font-medium">{sessionDate.toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          {/* Warning */}
          <Alert variant="destructive" className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950/30">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <AlertTitle className="text-yellow-700 dark:text-yellow-400">Important</AlertTitle>
            <AlertDescription className="text-yellow-600 dark:text-yellow-500">
              This action cannot be undone. Signing this documentation constitutes
              your legal attestation of its accuracy.
            </AlertDescription>
          </Alert>

          {/* Practitioner Name */}
          <div className="space-y-2">
            <Label htmlFor="signedBy">Signing Practitioner Name</Label>
            <Input
              id="signedBy"
              value={signedBy}
              onChange={(e) => setSignedBy(e.target.value)}
              placeholder="Dr. John Smith, MD"
            />
          </div>

          {/* Attestations */}
          <div className="space-y-3">
            <Label>Attestations</Label>
            
            <div className="flex items-start gap-3">
              <Checkbox
                id="reviewed"
                checked={attestations.reviewed}
                onCheckedChange={(checked) =>
                  setAttestations(prev => ({ ...prev, reviewed: !!checked }))
                }
              />
              <label htmlFor="reviewed" className="text-sm leading-tight cursor-pointer">
                I have reviewed the documentation in its entirety, including all
                SOAP note sections and transcription segments.
              </label>
            </div>

            <div className="flex items-start gap-3">
              <Checkbox
                id="accurate"
                checked={attestations.accurate}
                onCheckedChange={(checked) =>
                  setAttestations(prev => ({ ...prev, accurate: !!checked }))
                }
              />
              <label htmlFor="accurate" className="text-sm leading-tight cursor-pointer">
                I attest that the information contained in this documentation is
                accurate and complete to the best of my knowledge.
              </label>
            </div>

            <div className="flex items-start gap-3">
              <Checkbox
                id="authorized"
                checked={attestations.authorized}
                onCheckedChange={(checked) =>
                  setAttestations(prev => ({ ...prev, authorized: !!checked }))
                }
              />
              <label htmlFor="authorized" className="text-sm leading-tight cursor-pointer">
                I am authorized to sign this clinical documentation and accept
                responsibility for its contents.
              </label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSign}
            disabled={!canSign || isSigning}
            className="bg-green-600 hover:bg-green-700"
          >
            {isSigning ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Signing...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Sign Documentation
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
