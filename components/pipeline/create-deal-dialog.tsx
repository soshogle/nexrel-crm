'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

interface CreateDealDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  pipelineId: string;
}

export function CreateDealDialog({ open, onClose, onSuccess, pipelineId }: CreateDealDialogProps) {
  const [loading, setLoading] = useState(false);
  const [stages, setStages] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    value: '',
    stageId: '',
    leadId: '',
    priority: 'MEDIUM',
    expectedCloseDate: '',
  });

  useEffect(() => {
    if (open && pipelineId) {
      loadStages();
      loadLeads();
    }
  }, [open, pipelineId]);

  const loadStages = async () => {
    try {
      const response = await fetch(`/api/pipelines/${pipelineId}/stages`);
      if (response.ok) {
        const data = await response.json();
        setStages(data);
        if (data.length > 0) {
          setFormData(prev => ({ ...prev, stageId: data[0].id }));
        }
      }
    } catch (error) {
      console.error('Failed to load stages:', error);
    }
  };

  const loadLeads = async () => {
    try {
      const response = await fetch('/api/leads');
      if (response.ok) {
        const data = await response.json();
        setLeads(data);
      }
    } catch (error) {
      console.error('Failed to load leads:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/deals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          value: parseFloat(formData.value) || 0,
          pipelineId,
          leadId: formData.leadId || null,
          expectedCloseDate: formData.expectedCloseDate || null,
        }),
      });

      if (response.ok) {
        toast.success('Deal created successfully');
        onSuccess();
        setFormData({
          title: '',
          description: '',
          value: '',
          stageId: stages[0]?.id || '',
          leadId: '',
          priority: 'MEDIUM',
          expectedCloseDate: '',
        });
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to create deal');
      }
    } catch (error) {
      console.error('Failed to create deal:', error);
      toast.error('Failed to create deal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create New Deal</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Deal Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Enter deal title"
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Enter deal description"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="value">Deal Value ($) *</Label>
              <Input
                id="value"
                type="number"
                step="0.01"
                value={formData.value}
                onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                placeholder="0.00"
                required
              />
            </div>

            <div>
              <Label htmlFor="priority">Priority</Label>
              <Select value={formData.priority} onValueChange={(value) => setFormData({ ...formData, priority: value })}>
                <SelectTrigger id="priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="URGENT">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="stageId">Pipeline Stage *</Label>
              <Select 
                value={formData.stageId || "none"} 
                onValueChange={(value) => setFormData({ ...formData, stageId: value === "none" ? "" : value })}
              >
                <SelectTrigger id="stageId">
                  <SelectValue placeholder="Select stage" />
                </SelectTrigger>
                <SelectContent>
                  {stages.length === 0 && (
                    <SelectItem value="none" disabled>No stages available</SelectItem>
                  )}
                  {stages.map((stage) => (
                    <SelectItem key={stage.id} value={stage.id}>
                      {stage.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="leadId">Linked Lead</Label>
              <Select 
                value={formData.leadId || "none"} 
                onValueChange={(value) => setFormData({ ...formData, leadId: value === "none" ? "" : value })}
              >
                <SelectTrigger id="leadId">
                  <SelectValue placeholder="Select lead (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {leads.map((lead) => (
                    <SelectItem key={lead.id} value={lead.id}>
                      {lead.businessName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="expectedCloseDate">Expected Close Date</Label>
            <Input
              id="expectedCloseDate"
              type="date"
              value={formData.expectedCloseDate}
              onChange={(e) => setFormData({ ...formData, expectedCloseDate: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Deal'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
