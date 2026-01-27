'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Calendar, DollarSign, Edit2, Save, Trash2, X, Clock, User, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Deal {
  id: string;
  title: string;
  description?: string;
  value: number;
  currency: string;
  probability: number;
  priority: string;
  expectedCloseDate: string | null;
  lead?: {
    id: string;
    businessName: string;
    contactPerson?: string;
    email?: string;
    phone?: string;
  };
  assignedTo?: {
    id: string;
    name: string;
    avatar?: string;
  };
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

interface DealDetailModalProps {
  deal: Deal;
  open: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export function DealDetailModal({ deal, open, onClose, onUpdate }: DealDetailModalProps) {
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [activities, setActivities] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    title: deal.title,
    description: deal.description || '',
    value: deal.value.toString(),
    priority: deal.priority,
    expectedCloseDate: deal.expectedCloseDate || '',
  });

  useEffect(() => {
    if (open) {
      loadActivities();
      setFormData({
        title: deal.title,
        description: deal.description || '',
        value: deal.value.toString(),
        priority: deal.priority,
        expectedCloseDate: deal.expectedCloseDate || '',
      });
    }
  }, [open, deal]);

  const loadActivities = async () => {
    try {
      const response = await fetch(`/api/deals/${deal.id}/activities`);
      if (response.ok) {
        const data = await response.json();
        setActivities(data);
      }
    } catch (error) {
      console.error('Failed to load activities:', error);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/deals/${deal.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          value: parseFloat(formData.value) || 0,
          expectedCloseDate: formData.expectedCloseDate || null,
        }),
      });

      if (response.ok) {
        toast.success('Deal updated successfully');
        setEditing(false);
        onUpdate();
      } else {
        toast.error('Failed to update deal');
      }
    } catch (error) {
      console.error('Failed to update deal:', error);
      toast.error('Failed to update deal');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/deals/${deal.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Deal deleted successfully');
        onClose();
        onUpdate();
      } else {
        toast.error('Failed to delete deal');
      }
    } catch (error) {
      console.error('Failed to delete deal:', error);
      toast.error('Failed to delete deal');
    } finally {
      setLoading(false);
      setDeleteDialogOpen(false);
    }
  };

  const priorityColors = {
    URGENT: 'bg-red-500/10 text-red-500 border-red-500/20',
    HIGH: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
    MEDIUM: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    LOW: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-2xl">{deal.title}</DialogTitle>
              <div className="flex items-center gap-2">
                {!editing ? (
                  <>
                    <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
                      <Edit2 className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => setDeleteDialogOpen(true)}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  </>
                ) : (
                  <>
                    <Button size="sm" variant="outline" onClick={() => setEditing(false)}>
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                    <Button size="sm" onClick={handleSave} disabled={loading}>
                      <Save className="h-4 w-4 mr-2" />
                      Save
                    </Button>
                  </>
                )}
              </div>
            </div>
          </DialogHeader>

          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="activities">Activities</TabsTrigger>
              <TabsTrigger value="details">Details</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              {/* Deal Value */}
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold">Deal Value</h3>
                  </div>
                  <Badge className={priorityColors[deal.priority as keyof typeof priorityColors]}>
                    {deal.priority}
                  </Badge>
                </div>
                {editing ? (
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                    className="text-2xl font-bold"
                  />
                ) : (
                  <p className="text-3xl font-bold text-primary">
                    ${deal.value.toLocaleString()} {deal.currency}
                  </p>
                )}
                <p className="text-sm text-muted-foreground mt-2">
                  Probability: {deal.probability}%
                </p>
              </Card>

              {/* Lead Information */}
              {deal.lead && (
                <Card className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Building2 className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold">Lead Information</h3>
                  </div>
                  <div className="space-y-2">
                    <p className="font-medium">{deal.lead.businessName}</p>
                    {deal.lead.contactPerson && (
                      <p className="text-sm text-muted-foreground">
                        Contact: {deal.lead.contactPerson}
                      </p>
                    )}
                    {deal.lead.email && (
                      <p className="text-sm text-muted-foreground">
                        Email: {deal.lead.email}
                      </p>
                    )}
                    {deal.lead.phone && (
                      <p className="text-sm text-muted-foreground">
                        Phone: {deal.lead.phone}
                      </p>
                    )}
                  </div>
                </Card>
              )}

              {/* Description */}
              <Card className="p-6">
                <h3 className="font-semibold mb-3">Description</h3>
                {editing ? (
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={4}
                    placeholder="Add deal description"
                  />
                ) : (
                  <p className="text-muted-foreground">
                    {deal.description || 'No description provided'}
                  </p>
                )}
              </Card>

              {/* Expected Close Date */}
              {(deal.expectedCloseDate || editing) && (
                <Card className="p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Calendar className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold">Expected Close Date</h3>
                  </div>
                  {editing ? (
                    <Input
                      type="date"
                      value={formData.expectedCloseDate}
                      onChange={(e) => setFormData({ ...formData, expectedCloseDate: e.target.value })}
                    />
                  ) : deal.expectedCloseDate ? (
                    <p className="text-muted-foreground">
                      {format(new Date(deal.expectedCloseDate), 'MMMM dd, yyyy')}
                    </p>
                  ) : null}
                </Card>
              )}
            </TabsContent>

            <TabsContent value="activities" className="space-y-4">
              <Card className="p-6">
                <h3 className="font-semibold mb-4">Activity Timeline</h3>
                {activities.length > 0 ? (
                  <div className="space-y-4">
                    {activities.map((activity) => (
                      <div key={activity.id} className="flex gap-3 pb-4 border-b last:border-0">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <Clock className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{activity.description}</p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(activity.createdAt), 'MMM dd, yyyy HH:mm')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    No activities yet
                  </p>
                )}
              </Card>
            </TabsContent>

            <TabsContent value="details" className="space-y-4">
              <Card className="p-6">
                <div className="space-y-4">
                  <div>
                    <Label>Deal Title</Label>
                    {editing ? (
                      <Input
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      />
                    ) : (
                      <p className="mt-1">{deal.title}</p>
                    )}
                  </div>

                  <Separator />

                  <div>
                    <Label>Priority</Label>
                    {editing ? (
                      <Select value={formData.priority} onValueChange={(value) => setFormData({ ...formData, priority: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="LOW">Low</SelectItem>
                          <SelectItem value="MEDIUM">Medium</SelectItem>
                          <SelectItem value="HIGH">High</SelectItem>
                          <SelectItem value="URGENT">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge className={`mt-1 ${priorityColors[deal.priority as keyof typeof priorityColors]}`}>
                        {deal.priority}
                      </Badge>
                    )}
                  </div>

                  <Separator />

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground">Created</Label>
                      <p className="mt-1">{format(new Date(deal.createdAt), 'MMM dd, yyyy')}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Last Updated</Label>
                      <p className="mt-1">{format(new Date(deal.updatedAt), 'MMM dd, yyyy')}</p>
                    </div>
                  </div>
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Deal</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this deal? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={loading}>
              {loading ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
