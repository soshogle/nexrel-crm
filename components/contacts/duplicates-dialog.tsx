'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Loader2, Trash2, Mail, Phone, Building2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface DuplicatePair {
  lead1: {
    id: string;
    businessName: string;
    email: string | null;
    phone: string | null;
    createdAt: string;
  };
  lead2: {
    id: string;
    businessName: string;
    email: string | null;
    phone: string | null;
    createdAt: string;
  };
  similarity: number;
  matchType: string;
}

interface DuplicatesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function DuplicatesDialog({
  open,
  onOpenChange,
  onSuccess,
}: DuplicatesDialogProps) {
  const [loading, setLoading] = useState(false);
  const [duplicates, setDuplicates] = useState<DuplicatePair[]>([]);
  const [selectedPairs, setSelectedPairs] = useState<Set<number>>(new Set());
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (open) {
      fetchDuplicates();
    } else {
      setDuplicates([]);
      setSelectedPairs(new Set());
    }
  }, [open]);

  const fetchDuplicates = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/lead-generation/deduplicate?review=true&threshold=0.85');
      if (response.ok) {
        const data = await response.json();
        setDuplicates(data.duplicates || []);
      } else {
        toast.error('Failed to fetch duplicates');
      }
    } catch (error) {
      console.error('Error fetching duplicates:', error);
      toast.error('Failed to fetch duplicates');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPair = (index: number, checked: boolean) => {
    const newSelected = new Set(selectedPairs);
    if (checked) {
      newSelected.add(index);
    } else {
      newSelected.delete(index);
    }
    setSelectedPairs(newSelected);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedPairs(new Set(duplicates.map((_, index) => index)));
    } else {
      setSelectedPairs(new Set());
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedPairs.size === 0) {
      toast.error('Please select duplicates to delete');
      return;
    }

    if (!confirm(`Delete ${selectedPairs.size} duplicate pair(s)? This will remove the newer contact from each selected pair.`)) {
      return;
    }

    setDeleting(true);
    try {
      const contactIdsToDelete: string[] = [];
      
      // For each selected pair, determine which contact to delete (keep the older one)
      for (const index of selectedPairs) {
        const pair = duplicates[index];
        const lead1Date = new Date(pair.lead1.createdAt);
        const lead2Date = new Date(pair.lead2.createdAt);
        
        // Keep the older contact, delete the newer one
        const contactToDelete = lead1Date < lead2Date ? pair.lead2.id : pair.lead1.id;
        contactIdsToDelete.push(contactToDelete);
      }

      // Remove duplicates from the array (in case same contact appears in multiple pairs)
      const uniqueIdsToDelete = Array.from(new Set(contactIdsToDelete));

      const response = await fetch('/api/contacts/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactIds: uniqueIdsToDelete }),
      });

      if (response.ok) {
        toast.success(`Successfully deleted ${uniqueIdsToDelete.length} duplicate contact(s)`);
        setSelectedPairs(new Set());
        onSuccess();
        onOpenChange(false);
      } else {
        toast.error('Failed to delete duplicates');
      }
    } catch (error) {
      console.error('Error deleting duplicates:', error);
      toast.error('Failed to delete duplicates');
    } finally {
      setDeleting(false);
    }
  };

  const getMatchTypeBadge = (matchType: string) => {
    const colors: Record<string, string> = {
      email: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
      phone: 'bg-green-500/10 text-green-500 border-green-500/20',
      fuzzy: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    };
    return colors[matchType] || 'bg-gray-500/10 text-gray-500 border-gray-500/20';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Find and Delete Duplicates</DialogTitle>
          <DialogDescription>
            Review duplicate contacts and select which ones to delete. The older contact will be kept.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center p-12">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
              <p className="text-muted-foreground">Finding duplicates...</p>
            </div>
          </div>
        ) : duplicates.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <div className="rounded-full bg-green-500/10 p-3 mb-4">
              <AlertCircle className="h-6 w-6 text-green-500" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No duplicates found!</h3>
            <p className="text-muted-foreground">
              Your contacts list is clean. No duplicate contacts detected.
            </p>
          </div>
        ) : (
          <>
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={selectedPairs.size === duplicates.length && duplicates.length > 0}
                  onCheckedChange={handleSelectAll}
                />
                <span className="text-sm font-medium">
                  {selectedPairs.size} of {duplicates.length} pair(s) selected
                </span>
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDeleteSelected}
                disabled={selectedPairs.size === 0 || deleting}
              >
                {deleting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Selected ({selectedPairs.size})
                  </>
                )}
              </Button>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]"></TableHead>
                    <TableHead>Contact 1 (Keep)</TableHead>
                    <TableHead>Contact 2 (Delete)</TableHead>
                    <TableHead>Match Type</TableHead>
                    <TableHead>Similarity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {duplicates.map((pair, index) => {
                    const lead1Date = new Date(pair.lead1.createdAt);
                    const lead2Date = new Date(pair.lead2.createdAt);
                    const keepLead = lead1Date < lead2Date ? pair.lead1 : pair.lead2;
                    const deleteLead = lead1Date < lead2Date ? pair.lead2 : pair.lead1;
                    const isSelected = selectedPairs.has(index);

                    return (
                      <TableRow key={`${pair.lead1.id}-${pair.lead2.id}`}>
                        <TableCell>
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={(checked) => handleSelectPair(index, checked as boolean)}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-muted-foreground" />
                              {keepLead.businessName}
                            </div>
                            {keepLead.email && (
                              <div className="text-sm text-muted-foreground flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {keepLead.email}
                              </div>
                            )}
                            {keepLead.phone && (
                              <div className="text-sm text-muted-foreground flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {keepLead.phone}
                              </div>
                            )}
                            <div className="text-xs text-muted-foreground">
                              Created: {formatDate(keepLead.createdAt)}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium flex items-center gap-2 text-destructive">
                              <Building2 className="h-4 w-4 text-muted-foreground" />
                              {deleteLead.businessName}
                            </div>
                            {deleteLead.email && (
                              <div className="text-sm text-muted-foreground flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {deleteLead.email}
                              </div>
                            )}
                            {deleteLead.phone && (
                              <div className="text-sm text-muted-foreground flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {deleteLead.phone}
                              </div>
                            )}
                            <div className="text-xs text-muted-foreground">
                              Created: {formatDate(deleteLead.createdAt)}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={getMatchTypeBadge(pair.matchType)}>
                            {pair.matchType === 'email' ? 'Email Match' :
                             pair.matchType === 'phone' ? 'Phone Match' :
                             'Name Similarity'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm font-medium">
                            {Math.round(pair.similarity * 100)}%
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <div className="mt-4 text-sm text-muted-foreground">
              <p>
                💡 <strong>Tip:</strong> The older contact (by creation date) will be kept automatically. 
                You can select multiple pairs and delete them all at once.
              </p>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
