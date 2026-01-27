
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ReservationForm } from '@/components/reservations/reservation-form';
import { CheckCircle2, Calendar, Clock, Users } from 'lucide-react';
import { useParams } from 'next/navigation';

export default function PublicBookingPage() {
  const params = useParams();
  const userIdFromUrl = params?.userId as string;
  const [userId, setUserId] = useState<string>(userIdFromUrl);
  const [restaurantInfo, setRestaurantInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [confirmationCode, setConfirmationCode] = useState('');

  useEffect(() => {
    // Check if we're on a subdomain
    const getSubdomain = () => {
      const cookies = document.cookie.split(';');
      const subdomainCookie = cookies.find(c => c.trim().startsWith('tenant-subdomain='));
      if (subdomainCookie) {
        return subdomainCookie.split('=')[1];
      }
      return null;
    };

    const subdomain = getSubdomain();

    // If subdomain exists, resolve userId from subdomain
    const fetchBusinessInfo = async () => {
      try {
        if (subdomain) {
          // Resolve userId from subdomain
          const response = await fetch(`/api/subdomain/resolve/${subdomain}`);
          if (response.ok) {
            const data = await response.json();
            setUserId(data.userId);
            setRestaurantInfo({
              name: data.businessName,
              description: data.description || 'Make a reservation',
              phone: data.phone,
              address: data.address,
            });
          } else {
            // Fallback to URL userId
            setRestaurantInfo({
              name: 'Restaurant Name',
              description: 'Make a reservation at our restaurant',
            });
          }
        } else {
          // Use userId from URL
          setRestaurantInfo({
            name: 'Restaurant Name',
            description: 'Make a reservation at our restaurant',
          });
        }
      } catch (error) {
        console.error('Error fetching business info:', error);
        setRestaurantInfo({
          name: 'Restaurant Name',
          description: 'Make a reservation at our restaurant',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchBusinessInfo();
  }, [userIdFromUrl]);

  const handleSuccess = (reservation: any) => {
    setConfirmationCode(reservation.confirmationCode);
    setSubmitted(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center p-4">
        <Card className="max-w-2xl w-full">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl">Reservation Confirmed!</CardTitle>
            <CardDescription className="text-base">
              Your reservation has been successfully created
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-muted p-6 rounded-lg text-center">
              <p className="text-sm text-muted-foreground mb-2">Confirmation Code</p>
              <p className="text-3xl font-bold font-mono">{confirmationCode}</p>
              <p className="text-xs text-muted-foreground mt-2">
                Please save this code for your records
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Calendar className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="font-medium">Email Confirmation Sent</p>
                  <p className="text-muted-foreground text-xs">
                    Check your inbox for reservation details
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 text-sm">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Clock className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium">Reminder Set</p>
                  <p className="text-muted-foreground text-xs">
                    We'll send you a reminder 24 hours before
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 text-sm">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Users className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="font-medium">Looking Forward</p>
                  <p className="text-muted-foreground text-xs">
                    We can't wait to serve you!
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t pt-6 text-center text-sm text-muted-foreground">
              <p>
                Need to cancel or modify? Contact us with your confirmation code.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl">{restaurantInfo?.name || 'Make a Reservation'}</CardTitle>
          <CardDescription className="text-base">
            {restaurantInfo?.description || 'Book your table online'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ReservationForm onSuccess={handleSuccess} />
        </CardContent>
      </Card>
    </div>
  );
}
