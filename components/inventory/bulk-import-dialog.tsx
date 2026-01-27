
'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { Upload, Download, Loader2, AlertTriangle, CheckCircle2, X } from 'lucide-react';

interface BulkImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export default function BulkImportDialog({ open, onOpenChange, onSuccess }: BulkImportDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<'create' | 'update'>('create');
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<any>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
        toast.error('Please select a CSV file');
        return;
      }
      setFile(selectedFile);
      setResults(null);
    }
  };

  const parseCSV = (text: string): any[] => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length === 0) return [];

    const headers = lines[0].split(',').map(h => h.trim().replace(/['"]/g, ''));
    const items = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/['"]/g, ''));
      if (values.length === 0 || values[0] === '') continue;

      const item: any = { _rowIndex: i + 1 };
      headers.forEach((header, index) => {
        const key = header.toLowerCase().replace(/\s+/g, '');
        item[key] = values[index] || '';
      });
      items.push(item);
    }

    return items;
  };

  const handleImport = async () => {
    if (!file) {
      toast.error('Please select a file');
      return;
    }

    setIsProcessing(true);
    setResults(null);

    try {
      const text = await file.text();
      const items = parseCSV(text);

      if (items.length === 0) {
        toast.error('No valid items found in CSV');
        setIsProcessing(false);
        return;
      }

      const response = await fetch('/api/general-inventory/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items, mode }),
      });

      const data = await response.json();

      if (response.ok) {
        setResults(data.results);
        toast.success(data.message);
        if (data.results.success > 0 && onSuccess) {
          onSuccess();
        }
      } else {
        toast.error(data.error || 'Failed to import items');
      }
    } catch (error: any) {
      console.error('Import error:', error);
      toast.error('Failed to process CSV file');
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadTemplate = () => {
    const template = `sku,name,description,category,supplier,location,quantity,unit,reorderlevel,reorderquantity,costprice,sellingprice,barcode,notes
ITEM-001,Sample Item,Sample description,Electronics,Acme Corp,Warehouse A,100,unit,20,50,10.00,25.00,123456789,Sample notes`;
    
    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'inventory_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Template downloaded');
  };

  const handleClose = () => {
    setFile(null);
    setResults(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Bulk Import Items
          </DialogTitle>
          <DialogDescription>
            Upload a CSV file to import multiple inventory items at once
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Download Template */}
          <Alert>
            <Download className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>Download our CSV template to get started</span>
              <Button variant="outline" size="sm" onClick={downloadTemplate}>
                Download Template
              </Button>
            </AlertDescription>
          </Alert>

          {/* Import Mode */}
          <div className="space-y-2">
            <Label>Import Mode</Label>
            <Select value={mode} onValueChange={(value: any) => setMode(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="create">Create New Items (skip duplicates)</SelectItem>
                <SelectItem value="update">Update Existing Items</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {mode === 'create' 
                ? 'Only creates new items, skips items with existing SKUs' 
                : 'Updates existing items based on SKU, creates new ones if not found'}
            </p>
          </div>

          {/* File Upload */}
          <div className="space-y-2">
            <Label htmlFor="csv-file">Select CSV File</Label>
            <div className="flex items-center gap-2">
              <input
                id="csv-file"
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="flex-1 text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
              />
              {file && (
                <Button variant="ghost" size="sm" onClick={() => setFile(null)}>
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            {file && (
              <p className="text-sm text-muted-foreground">
                Selected: {file.name} ({(file.size / 1024).toFixed(2)} KB)
              </p>
            )}
          </div>

          {/* Results */}
          {results && (
            <div className="space-y-3">
              <h4 className="font-semibold">Import Results</h4>
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="text-sm font-medium">Success</span>
                  </div>
                  <p className="text-2xl font-bold text-green-600 mt-1">{results.success}</p>
                </div>
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <div className="flex items-center gap-2 text-red-600">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-sm font-medium">Failed</span>
                  </div>
                  <p className="text-2xl font-bold text-red-600 mt-1">{results.failed}</p>
                </div>
                <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                  <div className="flex items-center gap-2 text-yellow-600">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-sm font-medium">Skipped</span>
                  </div>
                  <p className="text-2xl font-bold text-yellow-600 mt-1">{results.skipped}</p>
                </div>
              </div>

              {/* Errors */}
              {results.errors && results.errors.length > 0 && (
                <div className="max-h-48 overflow-y-auto">
                  <h5 className="text-sm font-medium mb-2">Errors ({results.errors.length})</h5>
                  <div className="space-y-2">
                    {results.errors.slice(0, 10).map((err: any, idx: number) => (
                      <div key={idx} className="p-2 bg-red-500/10 border border-red-500/20 rounded text-sm">
                        <p className="font-medium text-red-600">Row {err.row}: {err.error}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          SKU: {err.data?.sku || 'N/A'} | Name: {err.data?.name || 'N/A'}
                        </p>
                      </div>
                    ))}
                    {results.errors.length > 10 && (
                      <p className="text-xs text-muted-foreground">
                        ... and {results.errors.length - 10} more errors
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isProcessing}>
            {results ? 'Close' : 'Cancel'}
          </Button>
          <Button onClick={handleImport} disabled={!file || isProcessing}>
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Import Items
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
