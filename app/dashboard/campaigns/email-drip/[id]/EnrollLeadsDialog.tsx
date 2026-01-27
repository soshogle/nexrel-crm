'use client';

import { useState, useEffect } from 'react';
import { X, Search, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'react-hot-toast';
import { Label } from '@/components/ui/label';

interface Lead {
  id: string;
  firstName?: string;
  lastName?: string;
  email: string;
  status: string;
}

interface EnrollLeadsDialogProps {
  campaignId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EnrollLeadsDialog({
  campaignId,
  isOpen,
  onClose,
  onSuccess,
}: EnrollLeadsDialogProps) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isOpen) {
      fetchLeads();
    }
  }, [isOpen]);

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/leads');
      
      if (!response.ok) {
        throw new Error('Failed to fetch leads');
      }

      const data = await response.json();
      setLeads(data.leads || []);
    } catch (error) {
      console.error('Error fetching leads:', error);
      toast.error('Failed to load leads');
    } finally {
      setLoading(false);
    }
  };

  const filteredLeads = leads.filter(lead => {
    const fullName = `${lead.firstName || ''} ${lead.lastName || ''}`.toLowerCase();
    const query = searchQuery.toLowerCase();
    return fullName.includes(query) || lead.email.toLowerCase().includes(query);
  });

  const handleToggleLead = (leadId: string) => {
    const newSelected = new Set(selectedLeads);
    if (newSelected.has(leadId)) {
      newSelected.delete(leadId);
    } else {
      newSelected.add(leadId);
    }
    setSelectedLeads(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedLeads.size === filteredLeads.length) {
      setSelectedLeads(new Set());
    } else {
      setSelectedLeads(new Set(filteredLeads.map(lead => lead.id)));
    }
  };

  const handleEnroll = async () => {
    if (selectedLeads.size === 0) {
      toast.error('Please select at least one lead');
      return;
    }

    try {
      setEnrolling(true);
      const response = await fetch(`/api/campaigns/drip/${campaignId}/enroll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadIds: Array.from(selectedLeads),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to enroll leads');
      }

      const result = await response.json();
      toast.success(
        `Successfully enrolled ${result.enrolled} lead(s). ${result.skipped || 0} already enrolled.`
      );
      onSuccess();
    } catch (error: any) {
      console.error('Error enrolling leads:', error);
      toast.error(error.message || 'Failed to enroll leads');
    } finally {
      setEnrolling(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Enroll Leads in Campaign</DialogTitle>
          <DialogDescription>
            Select leads to enroll in this email drip campaign
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search leads by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Select All */}
          {filteredLeads.length > 0 && (
            <div className="flex items-center space-x-2 pb-2 border-b">
              <Checkbox
                id="select-all"
                checked={selectedLeads.size === filteredLeads.length && filteredLeads.length > 0}
                onCheckedChange={handleSelectAll}
              />
              <Label htmlFor="select-all" className="text-sm font-medium">
                Select All ({selectedLeads.size} selected)
              </Label>
            </div>
          )}

          {/* Leads List */}
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="text-gray-500 mt-2 text-sm">Loading leads...</p>
              </div>
            ) : filteredLeads.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No leads found</p>
              </div>
            ) : (
              filteredLeads.map((lead) => (
                <div
                  key={lead.id}
                  className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                  onClick={() => handleToggleLead(lead.id)}
                >
                  <Checkbox
                    checked={selectedLeads.has(lead.id)}
                    onCheckedChange={() => handleToggleLead(lead.id)}
                  />
                  <div className="flex-1">
                    <p className="font-medium">
                      {lead.firstName} {lead.lastName}
                    </p>
                    <p className="text-sm text-gray-500">{lead.email}</p>
                  </div>
                  <span className="text-xs text-gray-500">{lead.status}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={enrolling}>
            Cancel
          </Button>
          <Button onClick={handleEnroll} disabled={enrolling || selectedLeads.size === 0}>
            {enrolling ? 'Enrolling...' : `Enroll ${selectedLeads.size} Lead(s)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
