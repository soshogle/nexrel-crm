/**
 * Document Upload Component (Law 25 Compliant)
 * Handles document upload with consent management
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { Upload, File, X, CheckCircle2, AlertCircle } from 'lucide-react';
import { DocumentType, DocumentAccessLevel } from '@prisma/client';

interface DocumentUploadProps {
  leadId: string;
  onUploadComplete?: () => void;
}

export function DocumentUpload({ leadId, onUploadComplete }: DocumentUploadProps) {
  const t = useTranslations('dental.documentUpload');
  const tToasts = useTranslations('dental.toasts');
  const tCommon = useTranslations('common');
  
  const [file, setFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState<DocumentType>('OTHER');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [accessLevel, setAccessLevel] = useState<DocumentAccessLevel>('RESTRICTED');
  const [hasConsent, setHasConsent] = useState<boolean | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  // Check consent on mount
  useEffect(() => {
    checkConsent();
  }, [leadId]);

  const checkConsent = async () => {
    try {
      const response = await fetch(`/api/dental/consent?leadId=${leadId}`);
      const data = await response.json();
      setHasConsent(data.consents && data.consents.length > 0);
    } catch (error) {
      console.error('Error checking consent:', error);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error(t('selectFile'));
      return;
    }

    if (hasConsent === false) {
      toast.error(t('consentRequired'));
      return;
    }

    try {
      setUploading(true);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('leadId', leadId);
      formData.append('documentType', documentType);
      formData.append('category', category);
      formData.append('description', description);
      formData.append('tags', tags);
      formData.append('accessLevel', accessLevel);

      const response = await fetch('/api/dental/documents', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || tToasts('documentUploadFailed'));
      }

      toast.success(tToasts('documentUploaded'));
      
      // Reset form
      setFile(null);
      setCategory('');
      setDescription('');
      setTags('');
      setDocumentType('OTHER');
      
      if (onUploadComplete) {
        onUploadComplete();
      }
    } catch (error: any) {
      toast.error(tToasts('documentUploadFailed') + ': ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('title')}</CardTitle>
        <CardDescription>
          {t('description')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Consent Warning */}
        {hasConsent === false && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {t('consentRequired')}
            </AlertDescription>
          </Alert>
        )}

        {/* File Upload Area */}
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`
            border-2 border-dashed rounded-lg p-8 text-center
            transition-colors
            ${dragActive ? 'border-purple-500 bg-purple-50' : 'border-gray-300'}
            ${file ? 'bg-green-50 border-green-500' : ''}
          `}
        >
          {file ? (
            <div className="space-y-2">
              <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
              <div className="font-medium">{file.name}</div>
              <div className="text-sm text-gray-500">{formatFileSize(file.size)}</div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFile(null)}
                disabled={uploading}
              >
                <X className="h-4 w-4 mr-2" />
                {tCommon('remove') || 'Remove'}
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <Upload className="h-12 w-12 text-gray-400 mx-auto" />
              <div>
                <Label htmlFor="file-upload" className="cursor-pointer">
                  <span className="text-purple-600 hover:text-purple-700 font-medium">
                    {t('selectFile')}
                  </span>
                  {' '}or drag and drop
                </Label>
                <Input
                  id="file-upload"
                  type="file"
                  className="hidden"
                  onChange={handleFileChange}
                  disabled={uploading}
                />
              </div>
              <p className="text-xs text-gray-500">
                PDF, Images, Documents (Max 10MB)
              </p>
            </div>
          )}
        </div>

        {/* Document Details */}
        {file && (
          <div className="space-y-4 pt-4 border-t">
            <div>
              <Label>{t('documentType')} *</Label>
              <Select value={documentType} onValueChange={(value) => setDocumentType(value as DocumentType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="XRAY">X-Ray</SelectItem>
                  <SelectItem value="PHOTO">Photo</SelectItem>
                  <SelectItem value="CONSENT_FORM">Consent Form</SelectItem>
                  <SelectItem value="INSURANCE_FORM">Insurance Form</SelectItem>
                  <SelectItem value="TREATMENT_PLAN">Treatment Plan</SelectItem>
                  <SelectItem value="INVOICE">Invoice</SelectItem>
                  <SelectItem value="MEDICAL_HISTORY">Medical History</SelectItem>
                  <SelectItem value="CORRESPONDENCE">Correspondence</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>{tCommon('category') || 'Category'}</Label>
              <Input
                placeholder="e.g., Initial Exam, Follow-up, Pre-treatment"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                disabled={uploading}
              />
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                placeholder="Document description..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                disabled={uploading}
              />
            </div>

            <div>
              <Label>Tags (comma-separated)</Label>
              <Input
                placeholder="e.g., xray, panoramic, 2024"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                disabled={uploading}
              />
            </div>

            <div>
              <Label>Access Level</Label>
              <Select 
                value={accessLevel} 
                onValueChange={(value) => setAccessLevel(value as DocumentAccessLevel)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PUBLIC">Public (All staff)</SelectItem>
                  <SelectItem value="RESTRICTED">Restricted (Specific roles)</SelectItem>
                  <SelectItem value="CONFIDENTIAL">Confidential (Creator & admins only)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Law 25 Compliance Info */}
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                <strong>Law 25 Compliance:</strong> This document will be stored in Canada (CA-QC region), 
                encrypted at rest, and retained for 7 years per medical record retention requirements.
              </AlertDescription>
            </Alert>

            <Button
              onClick={handleUpload}
              disabled={uploading || hasConsent === false}
              className="w-full"
            >
              {uploading ? 'Uploading...' : 'Upload Document'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
