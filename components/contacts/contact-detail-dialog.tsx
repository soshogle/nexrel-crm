
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Mail,
  Phone,
  MapPin,
  Globe,
  Building2,
  Calendar,
  MessageSquare,
  TrendingUp,
  DollarSign,
  PhoneCall,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { MakeCallDialog } from '@/components/voice-agents/make-call-dialog';

interface ContactDetailDialogProps {
  contact: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRefresh: () => void;
}

export default function ContactDetailDialog({
  contact,
  open,
  onOpenChange,
  onRefresh,
}: ContactDetailDialogProps) {
  const router = useRouter();
  const [activities, setActivities] = useState<any[]>([]);
  const [deals, setDeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCallDialog, setShowCallDialog] = useState(false);

  useEffect(() => {
    if (open && contact) {
      fetchContactDetails();
    }
  }, [open, contact]);

  const fetchContactDetails = async () => {
    setLoading(true);
    try {
      const [activitiesRes, dealsRes] = await Promise.all([
        fetch(`/api/contacts/${contact.id}/activities`),
        fetch(`/api/contacts/${contact.id}/deals`),
      ]);

      if (activitiesRes.ok) {
        const activitiesData = await activitiesRes.json();
        setActivities(activitiesData);
      }

      if (dealsRes.ok) {
        const dealsData = await dealsRes.json();
        setDeals(dealsData);
      }
    } catch (error) {
      console.error('Error fetching contact details:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      NEW: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
      CONTACTED: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
      QUALIFIED: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
      CONVERTED: 'bg-green-500/10 text-green-500 border-green-500/20',
      LOST: 'bg-red-500/10 text-red-500 border-red-500/20',
    };
    return colors[status] || 'bg-gray-500/10 text-gray-500 border-gray-500/20';
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      customer: 'bg-green-500/10 text-green-500',
      prospect: 'bg-blue-500/10 text-blue-500',
      partner: 'bg-purple-500/10 text-purple-500',
    };
    return colors[type] || 'bg-gray-500/10 text-gray-500';
  };

  if (!contact) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <DialogTitle className="text-2xl">{contact.businessName}</DialogTitle>
              {contact.contactPerson && (
                <DialogDescription className="text-base">
                  {contact.contactPerson}
                </DialogDescription>
              )}
            </div>
            <div className="flex gap-2">
              <Badge variant="outline" className={getStatusColor(contact.status)}>
                {contact.status}
              </Badge>
              {contact.contactType && (
                <Badge variant="outline" className={getTypeColor(contact.contactType)}>
                  {contact.contactType}
                </Badge>
              )}
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="deals">Deals</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {/* Contact Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {contact.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <a
                      href={`mailto:${contact.email}`}
                      className="text-primary hover:underline"
                    >
                      {contact.email}
                    </a>
                  </div>
                )}
                {contact.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <a
                      href={`tel:${contact.phone}`}
                      className="text-primary hover:underline"
                    >
                      {contact.phone}
                    </a>
                  </div>
                )}
                {contact.website && (
                  <div className="flex items-center gap-2 text-sm">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <a
                      href={contact.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      {contact.website}
                    </a>
                  </div>
                )}
                {(contact.address || contact.city || contact.state) && (
                  <div className="flex items-start gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      {contact.address && <div>{contact.address}</div>}
                      <div>
                        {contact.city}
                        {contact.state && `, ${contact.state}`}
                        {contact.zipCode && ` ${contact.zipCode}`}
                      </div>
                      {contact.country && <div>{contact.country}</div>}
                    </div>
                  </div>
                )}
                {contact.businessCategory && (
                  <div className="flex items-center gap-2 text-sm">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span>{contact.businessCategory}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Tags */}
            {contact.tags && contact.tags.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Tags</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {contact.tags.map((tag: string, idx: number) => (
                      <Badge key={idx} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Quick Actions */}
            <div className="flex gap-2">
              <Button
                className="flex-1"
                onClick={() => {
                  onOpenChange(false);
                  router.push(`/dashboard/messages`);
                }}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Send Message
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  onOpenChange(false);
                  router.push(`/dashboard/leads`);
                }}
              >
                <TrendingUp className="h-4 w-4 mr-2" />
                Convert to Deal
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="activity" className="space-y-4">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              </div>
            ) : activities.length > 0 ? (
              <div className="space-y-3">
                {activities.map((activity: any, idx: number) => (
                  <Card key={idx}>
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-3">
                        <div className="rounded-full bg-muted p-2">
                          {activity.type === 'call' && (
                            <PhoneCall className="h-4 w-4" />
                          )}
                          {activity.type === 'message' && (
                            <MessageSquare className="h-4 w-4" />
                          )}
                          {activity.type === 'deal' && (
                            <DollarSign className="h-4 w-4" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium">{activity.title}</div>
                          <div className="text-sm text-muted-foreground">
                            {activity.description}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {new Date(activity.createdAt).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="text-center py-8">
                  <p className="text-muted-foreground">No activity yet</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="deals" className="space-y-4">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              </div>
            ) : deals.length > 0 ? (
              <div className="space-y-3">
                {deals.map((deal: any) => (
                  <Card key={deal.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-medium">{deal.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {deal.stage}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-lg">
                            ${deal.value?.toLocaleString() || '0'}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(deal.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="text-center py-8">
                  <p className="text-muted-foreground">No deals yet</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
