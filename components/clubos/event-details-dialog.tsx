
'use client';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { format } from 'date-fns';
import { Calendar, Clock, MapPin, Users, Trash2, Edit } from 'lucide-react';

interface EventDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: any;
  onDelete?: (id: string) => void;
}

export function EventDetailsDialog({ open, onOpenChange, event, onDelete }: EventDetailsDialogProps) {
  if (!event) return null;

  const getEventTypeColor = (eventType: string) => {
    const colors: Record<string, string> = {
      GAME: 'bg-blue-500',
      PRACTICE: 'bg-green-500',
      TOURNAMENT: 'bg-purple-500',
      TRYOUT: 'bg-orange-500',
      MEETING: 'bg-gray-500',
    };
    return colors[eventType] || 'bg-gray-500';
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      SCHEDULED: 'bg-blue-500',
      IN_PROGRESS: 'bg-yellow-500',
      COMPLETED: 'bg-green-500',
      POSTPONED: 'bg-orange-500',
      CANCELLED: 'bg-red-500',
    };
    return colors[status] || 'bg-gray-500';
  };

  const handleDelete = () => {
    if (onDelete && confirm('Are you sure you want to cancel this event?')) {
      onDelete(event.id);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <DialogTitle className="text-2xl">{event.title}</DialogTitle>
              <DialogDescription>
                <div className="flex items-center gap-2 mt-2">
                  <Badge className={getEventTypeColor(event.eventType)}>
                    {event.eventType}
                  </Badge>
                  <Badge className={getStatusColor(event.status)}>
                    {event.status}
                  </Badge>
                </div>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Date and Time */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Date</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(event.startTime), 'EEEE, MMMM d, yyyy')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Time</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(event.startTime), 'h:mm a')} - {format(new Date(event.endTime), 'h:mm a')}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Venue */}
          {event.venue && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{event.venue.name}</p>
                    {event.venue.address && (
                      <p className="text-sm text-muted-foreground">{event.venue.address}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Teams */}
          {(event.homeTeam || event.awayTeam || event.practiceTeam) && (
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-muted-foreground" />
                    <p className="font-medium">Teams</p>
                  </div>
                  <div className="space-y-2 ml-7">
                    {event.eventType === 'PRACTICE' && event.practiceTeam && (
                      <div>
                        <p className="text-sm font-medium">{event.practiceTeam.name}</p>
                        {event.practiceTeam.division && (
                          <p className="text-xs text-muted-foreground">{event.practiceTeam.division.name}</p>
                        )}
                      </div>
                    )}
                    {event.eventType !== 'PRACTICE' && (
                      <>
                        {event.homeTeam && (
                          <div>
                            <p className="text-sm"><span className="font-medium">Home:</span> {event.homeTeam.name}</p>
                            {event.homeTeam.division && (
                              <p className="text-xs text-muted-foreground ml-12">{event.homeTeam.division.name}</p>
                            )}
                          </div>
                        )}
                        {event.awayTeam && (
                          <div>
                            <p className="text-sm"><span className="font-medium">Away:</span> {event.awayTeam.name}</p>
                            {event.awayTeam.division && (
                              <p className="text-xs text-muted-foreground ml-12">{event.awayTeam.division.name}</p>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Description and Notes */}
          {(event.description || event.notes) && (
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-3">
                  {event.description && (
                    <div>
                      <p className="font-medium mb-1">Description</p>
                      <p className="text-sm text-muted-foreground">{event.description}</p>
                    </div>
                  )}
                  {event.notes && (
                    <div>
                      <p className="font-medium mb-1">Notes</p>
                      <p className="text-sm text-muted-foreground">{event.notes}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Scores for completed games */}
          {event.eventType === 'GAME' && event.status === 'COMPLETED' && (event.homeScore !== null || event.awayScore !== null) && (
            <Card>
              <CardContent className="pt-6">
                <div>
                  <p className="font-medium mb-2">Final Score</p>
                  <div className="flex items-center justify-center gap-8 text-2xl font-bold">
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground mb-1">{event.homeTeam?.name || 'Home'}</p>
                      <p>{event.homeScore || 0}</p>
                    </div>
                    <span className="text-muted-foreground">-</span>
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground mb-1">{event.awayTeam?.name || 'Away'}</p>
                      <p>{event.awayScore || 0}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-2 pt-4">
          {onDelete && event.status !== 'CANCELLED' && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Cancel Event
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
