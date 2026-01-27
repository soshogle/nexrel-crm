
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  MapPin,
  Package,
  User,
  Phone,
  Clock,
  Navigation,
  Truck,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Store,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { toast } from 'sonner';

// Dynamically import map component to avoid SSR issues
const DeliveryMap = dynamic(
  () => import('@/components/delivery/delivery-map'),
  { ssr: false, loading: () => <div className="h-[400px] bg-muted animate-pulse rounded-lg" /> }
);

interface TrackingData {
  orderNumber: string | null;
  status: string;
  customerName: string;
  merchantName: string | null;
  merchantPhone: string | null;
  pickupAddress: string;
  deliveryAddress: string;
  pickup: { lat: number; lng: number } | null;
  delivery: { lat: number; lng: number } | null;
  driver: {
    name: string;
    phone: string;
    vehicleType: string;
    vehicleNumber: string;
    currentLocation: {
      lat: number;
      lng: number;
      heading: number | null;
      speed: number | null;
      updatedAt: string;
    } | null;
  } | null;
  scheduledPickupTime: string | null;
  actualPickupTime: string | null;
  estimatedDeliveryTime: string | null;
  actualDeliveryTime: string | null;
  estimatedMinutesRemaining: number | null;
  deliveryInstructions: string | null;
  orderValue: number;
  deliveryFee: number;
  createdAt: string;
  updatedAt: string;
}

export default function TrackDeliveryPage() {
  const params = useParams();
  const trackingCode = params?.trackingCode as string;

  const [trackingData, setTrackingData] = useState<TrackingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchTrackingData = useCallback(async (showToast = false) => {
    try {
      if (showToast) setRefreshing(true);
      
      const res = await fetch(`/api/delivery/track/${trackingCode}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch tracking data');
      }

      setTrackingData(data);
      setError(null);
      
      if (showToast) {
        toast.success('Tracking updated');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load tracking information';
      setError(message);
      if (showToast) {
        toast.error(message);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [trackingCode]);

  useEffect(() => {
    fetchTrackingData();

    // Poll for updates every 10 seconds if delivery is in progress
    const interval = setInterval(() => {
      if (trackingData && !['DELIVERED', 'CANCELLED'].includes(trackingData.status)) {
        fetchTrackingData();
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [fetchTrackingData, trackingData]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DELIVERED':
        return 'bg-green-500';
      case 'IN_TRANSIT':
      case 'PICKED_UP':
        return 'bg-blue-500';
      case 'PENDING':
      case 'ASSIGNED':
        return 'bg-yellow-500';
      case 'CANCELLED':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusLabel = (status: string) => {
    return status.replace(/_/g, ' ');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardContent className="p-8">
            <div className="flex flex-col items-center space-y-4">
              <RefreshCw className="h-12 w-12 animate-spin text-blue-500" />
              <p className="text-lg text-muted-foreground">Loading tracking information...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !trackingData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardContent className="p-8">
            <div className="flex flex-col items-center space-y-4">
              <AlertCircle className="h-12 w-12 text-red-500" />
              <h2 className="text-2xl font-bold">Tracking Not Found</h2>
              <p className="text-muted-foreground text-center">
                {error || 'Unable to find delivery with this tracking code.'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isDelivered = trackingData.status === 'DELIVERED';
  const isInProgress = ['IN_TRANSIT', 'PICKED_UP'].includes(trackingData.status);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-8 px-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Track Your Delivery</h1>
            <p className="text-muted-foreground">
              Order {trackingData.orderNumber || trackingCode.substring(0, 8).toUpperCase()}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchTrackingData(true)}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Status Badge */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className={`p-3 rounded-full ${getStatusColor(trackingData.status)}`}>
                  {isDelivered ? (
                    <CheckCircle2 className="h-6 w-6 text-white" />
                  ) : (
                    <Truck className="h-6 w-6 text-white" />
                  )}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <p className="text-2xl font-bold">{getStatusLabel(trackingData.status)}</p>
                </div>
              </div>
              {trackingData.estimatedMinutesRemaining !== null && isInProgress && (
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Estimated Arrival</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {trackingData.estimatedMinutesRemaining} mins
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Map */}
        {trackingData.pickup && trackingData.delivery && (
          <Card>
            <CardHeader>
              <CardTitle>Live Tracking</CardTitle>
            </CardHeader>
            <CardContent>
              <DeliveryMap
                pickup={trackingData.pickup}
                delivery={trackingData.delivery}
                driverLocation={trackingData.driver?.currentLocation || null}
                status={trackingData.status}
              />
            </CardContent>
          </Card>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          {/* Addresses */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <MapPin className="h-5 w-5 mr-2" />
                Delivery Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground flex items-center">
                  <Store className="h-4 w-4 mr-2" />
                  Pickup Location
                </p>
                <p className="mt-1">{trackingData.pickupAddress}</p>
              </div>
              <Separator />
              <div>
                <p className="text-sm font-medium text-muted-foreground flex items-center">
                  <MapPin className="h-4 w-4 mr-2" />
                  Delivery Location
                </p>
                <p className="mt-1">{trackingData.deliveryAddress}</p>
              </div>
              {trackingData.deliveryInstructions && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Instructions</p>
                    <p className="mt-1 text-sm">{trackingData.deliveryInstructions}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Driver Info */}
          {trackingData.driver && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="h-5 w-5 mr-2" />
                  Driver Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p className="font-medium">{trackingData.driver.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <a
                    href={`tel:${trackingData.driver.phone}`}
                    className="font-medium text-blue-600 hover:underline flex items-center"
                  >
                    <Phone className="h-4 w-4 mr-2" />
                    {trackingData.driver.phone}
                  </a>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Vehicle</p>
                  <p className="font-medium">
                    {trackingData.driver.vehicleType} - {trackingData.driver.vehicleNumber}
                  </p>
                </div>
                {trackingData.driver.currentLocation && (
                  <div>
                    <p className="text-sm text-muted-foreground">Last Updated</p>
                    <p className="font-medium text-sm">
                      {new Date(trackingData.driver.currentLocation.updatedAt).toLocaleTimeString()}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="h-5 w-5 mr-2" />
              Delivery Timeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <TimelineItem
                icon={<Package className="h-4 w-4" />}
                title="Order Created"
                time={new Date(trackingData.createdAt).toLocaleString()}
                completed={true}
              />
              {trackingData.actualPickupTime && (
                <TimelineItem
                  icon={<CheckCircle2 className="h-4 w-4" />}
                  title="Picked Up"
                  time={new Date(trackingData.actualPickupTime).toLocaleString()}
                  completed={true}
                />
              )}
              {trackingData.estimatedDeliveryTime && !trackingData.actualDeliveryTime && (
                <TimelineItem
                  icon={<Navigation className="h-4 w-4" />}
                  title="Estimated Delivery"
                  time={new Date(trackingData.estimatedDeliveryTime).toLocaleString()}
                  completed={false}
                  active={isInProgress}
                />
              )}
              {trackingData.actualDeliveryTime && (
                <TimelineItem
                  icon={<CheckCircle2 className="h-4 w-4" />}
                  title="Delivered"
                  time={new Date(trackingData.actualDeliveryTime).toLocaleString()}
                  completed={true}
                />
              )}
            </div>
          </CardContent>
        </Card>

        {/* Merchant Info */}
        {trackingData.merchantName && (
          <Card>
            <CardHeader>
              <CardTitle>Need Help?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-2">
                Contact {trackingData.merchantName}
              </p>
              {trackingData.merchantPhone && (
                <a
                  href={`tel:${trackingData.merchantPhone}`}
                  className="text-blue-600 hover:underline flex items-center"
                >
                  <Phone className="h-4 w-4 mr-2" />
                  {trackingData.merchantPhone}
                </a>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function TimelineItem({
  icon,
  title,
  time,
  completed,
  active = false,
}: {
  icon: React.ReactNode;
  title: string;
  time: string;
  completed: boolean;
  active?: boolean;
}) {
  return (
    <div className="flex items-start space-x-4">
      <div
        className={`p-2 rounded-full ${
          completed
            ? 'bg-green-500 text-white'
            : active
            ? 'bg-blue-500 text-white animate-pulse'
            : 'bg-gray-300 text-gray-600'
        }`}
      >
        {icon}
      </div>
      <div className="flex-1">
        <p className={`font-medium ${active ? 'text-blue-600' : ''}`}>{title}</p>
        <p className="text-sm text-muted-foreground">{time}</p>
      </div>
    </div>
  );
}
