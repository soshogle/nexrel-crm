
'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ReservationCalendarView } from '@/components/reservations/reservation-calendar-view';
import { ReservationList } from '@/components/reservations/reservation-list';
import { ReservationForm } from '@/components/reservations/reservation-form';
import { Calendar, List, Plus, Settings, Table } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

export default function ReservationsPage() {
  const [showNewReservationDialog, setShowNewReservationDialog] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleReservationSuccess = (reservation: any) => {
    setShowNewReservationDialog(false);
    setRefreshKey((prev) => prev + 1);
    toast.success(`Reservation created! Confirmation code: ${reservation.confirmationCode}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Reservations</h1>
          <p className="text-muted-foreground">
            Manage your restaurant reservations and table bookings
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/dashboard/reservations/tables">
              <Table className="h-4 w-4 mr-2" />
              Tables
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/dashboard/reservations/settings">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Link>
          </Button>
          <Dialog open={showNewReservationDialog} onOpenChange={setShowNewReservationDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Reservation
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Reservation</DialogTitle>
                <DialogDescription>
                  Fill in the details to create a new reservation
                </DialogDescription>
              </DialogHeader>
              <ReservationForm onSuccess={handleReservationSuccess} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Today's Reservations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">-</div>
            <p className="text-xs text-muted-foreground">Loading...</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Confirmed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">-</div>
            <p className="text-xs text-muted-foreground">Loading...</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">-</div>
            <p className="text-xs text-muted-foreground">Loading...</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Seated
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">-</div>
            <p className="text-xs text-muted-foreground">Loading...</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="calendar" className="space-y-4">
        <TabsList>
          <TabsTrigger value="calendar">
            <Calendar className="h-4 w-4 mr-2" />
            Calendar View
          </TabsTrigger>
          <TabsTrigger value="list">
            <List className="h-4 w-4 mr-2" />
            List View
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" key={`calendar-${refreshKey}`}>
          <ReservationCalendarView />
        </TabsContent>

        <TabsContent value="list" key={`list-${refreshKey}`}>
          <Card>
            <CardHeader>
              <CardTitle>All Reservations</CardTitle>
              <CardDescription>
                View and manage all your reservations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ReservationList />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
