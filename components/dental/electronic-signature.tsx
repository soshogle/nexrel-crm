/**
 * Electronic Signature Component
 * Canvas-based signature pad for document signing
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { PenTool, X, Check, Download, Upload } from 'lucide-react';

interface ElectronicSignatureProps {
  userId: string;
  leadId?: string;
  documentId?: string;
  onSignatureComplete?: (signatureData: string) => void;
  readOnly?: boolean;
}

export function ElectronicSignature({
  userId,
  leadId,
  documentId,
  onSignatureComplete,
  readOnly = false,
}: ElectronicSignatureProps) {
  const t = useTranslations('dental.signature');
  const tToasts = useTranslations('dental.toasts');
  const tCommon = useTranslations('common');
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [signerName, setSignerName] = useState('');
  const [signerTitle, setSignerTitle] = useState('');
  const [signatureDate, setSignatureDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = canvas.offsetWidth;
    canvas.height = 200;

    // Set drawing style
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Load existing signature if in read-only mode
    if (readOnly && signatureData) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0);
      };
      img.src = signatureData;
    }
  }, [signatureData, readOnly]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (readOnly) return;
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || readOnly) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (readOnly) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (!canvas) return;
    setSignatureData(canvas.toDataURL('image/png'));
  };

  const clearSignature = () => {
    if (readOnly) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSignatureData(null);
  };

  const handleSaveSignature = async () => {
    if (!signatureData) {
      toast.error(t('provideSignature'));
      return;
    }

    if (!signerName.trim()) {
      toast.error(t('enterName'));
      return;
    }

    try {
      const signaturePayload = {
        userId,
        leadId: leadId || null,
        documentId: documentId || null,
        signatureData,
        signerName: signerName.trim(),
        signerTitle: signerTitle.trim() || null,
        signatureDate: new Date(signatureDate),
        notes: notes.trim() || null,
      };

      const response = await fetch('/api/dental/signatures', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(signaturePayload),
      });

      if (response.ok) {
        toast.success(tToasts('signatureSaved'));
        onSignatureComplete?.(signatureData);
      } else {
        const error = await response.json();
        toast.error(error.error || tToasts('signatureSaveFailed'));
      }
    } catch (error: any) {
      toast.error(tToasts('signatureSaveFailed') + ': ' + error.message);
    }
  };

  const downloadSignature = () => {
    if (!signatureData) return;

    const link = document.createElement('a');
    link.download = `signature-${Date.now()}.png`;
    link.href = signatureData;
    link.click();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('title')}</CardTitle>
        <CardDescription>
          {t('description')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Signature Canvas */}
        <div className="space-y-2">
          <Label>{t('signHere')}</Label>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 bg-white">
            <canvas
              ref={canvasRef}
              className="w-full cursor-crosshair touch-none"
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
              style={{ height: '200px' }}
            />
          </div>
          {!readOnly && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={clearSignature}>
                <X className="h-4 w-4 mr-1" />
                {t('clear')}
              </Button>
              {signatureData && (
                <Button variant="outline" size="sm" onClick={downloadSignature}>
                  <Download className="h-4 w-4 mr-1" />
                  {t('download')}
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Signer Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="signerName">{t('signerName')} *</Label>
            <Input
              id="signerName"
              value={signerName}
              onChange={(e) => setSignerName(e.target.value)}
              placeholder={t('signerName')}
              disabled={readOnly}
            />
          </div>
          <div>
            <Label htmlFor="signerTitle">{tCommon('title') || 'Title'}/{tCommon('role') || 'Role'}</Label>
            <Input
              id="signerTitle"
              value={signerTitle}
              onChange={(e) => setSignerTitle(e.target.value)}
              placeholder="e.g., Patient, Guardian, Dentist"
              disabled={readOnly}
            />
          </div>
          <div>
            <Label htmlFor="signatureDate">{t('signatureDate')} *</Label>
            <Input
              id="signatureDate"
              type="date"
              value={signatureDate}
              onChange={(e) => setSignatureDate(e.target.value)}
              disabled={readOnly}
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <Label htmlFor="notes">{t('notes') || tCommon('notes')}</Label>
          <Textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t('notes') || 'Additional notes or context'}
            rows={3}
            disabled={readOnly}
          />
        </div>

        {/* Action Buttons */}
        {!readOnly && (
          <div className="flex gap-2">
            <Button onClick={handleSaveSignature} disabled={!signatureData || !signerName.trim()}>
              <Check className="h-4 w-4 mr-2" />
              {t('save')}
            </Button>
            <Button variant="outline" onClick={clearSignature}>
              <X className="h-4 w-4 mr-2" />
              {t('clear')}
            </Button>
          </div>
        )}

        {/* Instructions */}
        {!readOnly && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Instructions:</strong> Use your mouse or touch screen to sign in the box above.
              On touch devices, use your finger or stylus. Click "Clear" to start over.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
