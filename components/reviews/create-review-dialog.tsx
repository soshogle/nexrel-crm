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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Star, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Lead {
  id: string;
  businessName: string;
  contactPerson: string | null;
}

interface Campaign {
  id: string;
  name: string;
}

interface CreateReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function CreateReviewDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateReviewDialogProps) {
  const [loading, setLoading] = useState(false);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [formData, setFormData] = useState({
    campaignId: '',
    leadId: '',
    source: '',
    rating: 5,
    reviewText: '',
    reviewUrl: '',
    isPublic: true,
  });

  useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open]);

  const fetchData = async () => {
    try {
      const [leadsRes, campaignsRes] = await Promise.all([
        fetch('/api/contacts'),
        fetch('/api/campaigns'),
      ]);

      if (leadsRes.ok) {
        const leadsData = await leadsRes.json();
        setLeads(Array.isArray(leadsData) ? leadsData : []);
      }

      if (campaignsRes.ok) {
        const campaignsData = await campaignsRes.json();
        setCampaigns(campaignsData.campaigns || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create review');
      }

      toast.success('Review added successfully');
      onSuccess();
      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      console.error('Error creating review:', error);
      toast.error(error.message || 'Failed to create review');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      campaignId: '',
      leadId: '',
      source: '',
      rating: 5,
      reviewText: '',
      reviewUrl: '',
      isPublic: true,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gradient-to-br from-purple-900/95 via-purple-800/95 to-pink-900/95 border-purple-500/30 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="text-white text-xl">Add Review</DialogTitle>
          <DialogDescription className="text-white/70">
            Record a review from one of your customers
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="campaignId" className="text-white/90">
                Campaign *
              </Label>
              <Select
                value={formData.campaignId}
                onValueChange={(value) =>
                  setFormData({ ...formData, campaignId: value })
                }
                required
              >
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue placeholder="Select campaign" />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-gray-700">
                  {campaigns.map((campaign) => (
                    <SelectItem key={campaign.id} value={campaign.id}>
                      {campaign.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="leadId" className="text-white/90">
                Customer *
              </Label>
              <Select
                value={formData.leadId}
                onValueChange={(value) =>
                  setFormData({ ...formData, leadId: value })
                }
                required
              >
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue placeholder="Select customer" />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-gray-700">
                  {leads.map((lead) => (
                    <SelectItem key={lead.id} value={lead.id}>
                      {lead.businessName}
                      {lead.contactPerson && ` (${lead.contactPerson})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="source" className="text-white/90">
                Platform *
              </Label>
              <Select
                value={formData.source}
                onValueChange={(value) =>
                  setFormData({ ...formData, source: value })
                }
                required
              >
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue placeholder="Select platform" />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-gray-700">
                  <SelectItem value="GOOGLE">Google</SelectItem>
                  <SelectItem value="FACEBOOK">Facebook</SelectItem>
                  <SelectItem value="YELP">Yelp</SelectItem>
                  <SelectItem value="TRUSTPILOT">Trustpilot</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-white/90 mb-2 block">Rating *</Label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() =>
                      setFormData({ ...formData, rating: star })
                    }
                    className="focus:outline-none"
                  >
                    <Star
                      className={`h-8 w-8 transition-all ${
                        star <= formData.rating
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-white/30 hover:text-yellow-400/50'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="reviewText" className="text-white/90">
              Review Text
            </Label>
            <Textarea
              id="reviewText"
              value={formData.reviewText}
              onChange={(e) =>
                setFormData({ ...formData, reviewText: e.target.value })
              }
              placeholder="Enter the review content..."
              rows={4}
              className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
            />
          </div>

          <div>
            <Label htmlFor="reviewUrl" className="text-white/90">
              Review URL
            </Label>
            <Input
              id="reviewUrl"
              type="url"
              value={formData.reviewUrl}
              onChange={(e) =>
                setFormData({ ...formData, reviewUrl: e.target.value })
              }
              placeholder="https://..."
              className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isPublic"
              checked={formData.isPublic}
              onChange={(e) =>
                setFormData({ ...formData, isPublic: e.target.checked })
              }
              className="w-4 h-4 rounded border-white/20 bg-white/5"
            />
            <Label htmlFor="isPublic" className="text-white/90">
              Make this review public
            </Label>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="bg-white/5 border-white/10 text-white hover:bg-white/10"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                'Add Review'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
