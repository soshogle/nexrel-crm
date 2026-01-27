
'use client';

import { useState } from 'react';
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
import { Label } from '@/components/ui/label';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ImportContactsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function ImportContactsDialog({
  open,
  onOpenChange,
  onSuccess,
}: ImportContactsDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<any[]>([]);
  const [importResult, setImportResult] = useState<{
    success: number;
    failed: number;
    errors: string[];
  } | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.csv')) {
      toast.error('Please upload a CSV file');
      return;
    }

    if (selectedFile.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    setFile(selectedFile);
    setImportResult(null);

    // Parse CSV for preview
    const text = await selectedFile.text();
    const lines = text.split('\n').filter((line) => line.trim());
    const headers = lines[0].split(',').map((h) => h.trim());
    const previewData = lines.slice(1, 6).map((line) => {
      const values = line.split(',').map((v) => v.trim());
      const row: any = {};
      headers.forEach((header, idx) => {
        row[header] = values[idx] || '';
      });
      return row;
    });

    setPreview(previewData);
  };

  const handleImport = async () => {
    if (!file) {
      toast.error('Please select a file');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/contacts/import', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (response.ok) {
        setImportResult(result);
        if (result.success > 0) {
          toast.success(`${result.success} contacts imported successfully`);
          onSuccess();
        }
        if (result.failed > 0) {
          toast.warning(`${result.failed} contacts failed to import`);
        }
      } else {
        toast.error(result.error || 'Failed to import contacts');
      }
    } catch (error) {
      console.error('Error importing contacts:', error);
      toast.error('Failed to import contacts');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setPreview([]);
    setImportResult(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Contacts from CSV</DialogTitle>
          <DialogDescription>
            Upload a CSV file with your contacts. Maximum 100 rows per file.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* File Upload */}
          <div className="space-y-2">
            <Label>CSV File</Label>
            <div className="flex items-center gap-2">
              <Input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                disabled={loading}
              />
              {file && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    setFile(null);
                    setPreview([]);
                    setImportResult(null);
                  }}
                >
                  ×
                </Button>
              )}
            </div>
          </div>

          {/* Format Guide */}
          <Alert>
            <FileSpreadsheet className="h-4 w-4" />
            <AlertDescription>
              <div className="text-sm space-y-2">
                <p className="font-medium">Expected CSV format:</p>
                <p>
                  businessName, contactPerson, email, phone, address, city, state,
                  zipCode, country, website, businessCategory, contactType
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Required: businessName. Optional: all other fields.
                  contactType can be: customer, prospect, or partner.
                </p>
              </div>
            </AlertDescription>
          </Alert>

          {/* Preview */}
          {preview.length > 0 && !importResult && (
            <div className="space-y-2">
              <Label>Preview (first 5 rows)</Label>
              <div className="border rounded-lg p-4 max-h-64 overflow-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      {Object.keys(preview[0]).map((key) => (
                        <th key={key} className="text-left p-2 font-medium">
                          {key}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row, idx) => (
                      <tr key={idx} className="border-b">
                        {Object.values(row).map((value: any, i) => (
                          <td key={i} className="p-2">
                            {value || '-'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Import Result */}
          {importResult && (
            <div className="space-y-2">
              <Alert
                className={
                  importResult.success > 0
                    ? 'border-green-500/50 text-green-600'
                    : 'border-red-500/50 text-red-600'
                }
              >
                {importResult.success > 0 ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                <AlertDescription>
                  <div className="space-y-2">
                    <p className="font-medium">
                      {importResult.success} contacts imported successfully
                    </p>
                    {importResult.failed > 0 && (
                      <p>{importResult.failed} contacts failed to import</p>
                    )}
                  </div>
                </AlertDescription>
              </Alert>

              {importResult.errors.length > 0 && (
                <div className="border rounded-lg p-4 max-h-48 overflow-auto">
                  <Label className="mb-2">Errors:</Label>
                  <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
                    {importResult.errors.map((error, idx) => (
                      <li key={idx}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            {importResult ? 'Close' : 'Cancel'}
          </Button>
          {!importResult && (
            <Button onClick={handleImport} disabled={!file || loading}>
              {loading ? 'Importing...' : 'Import Contacts'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
