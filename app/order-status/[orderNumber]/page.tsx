
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Clock,
  CheckCircle2,
  Package,
  Truck,
  ChefHat,
  Phone,
  MapPin,
  Receipt,
} from 'lucide-react';
import { toast } from 'sonner';

export default function OrderStatusPage() {
  const params = useParams();
  const orderNumber = params?.orderNumber as string;
  const [orderStatus, setOrderStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    if (!orderNumber) return;

    const fetchOrderStatus = async () => {
      try {
        const res = await fetch(`/api/orders/status/${orderNumber}`);
        if (!res.ok) {
          throw new Error('Order not found');
        }
        const data = await res.json();
        setOrderStatus(data);
        setLastUpdate(new Date());
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch order status:', error);
        toast.error('Order not found or invalid order number');
        setLoading(false);
      }
    };

    // Initial fetch
    fetchOrderStatus();

    // Poll every 10 seconds for updates
    const interval = setInterval(fetchOrderStatus, 10000);

    return () => clearInterval(interval);
  }, [orderNumber]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading order status...</p>
        </div>
      </div>
    );
  }

  if (!orderStatus) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6 text-center">
            <Package className="h-12 w-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Order Not Found</h3>
            <p className="text-sm text-muted-foreground">
              We couldn't find an order with number <strong>{orderNumber}</strong>.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Please check the order number and try again.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
      case 'DELIVERED':
        return 'default';
      case 'IN_PROGRESS':
      case 'IN_TRANSIT':
        return 'secondary';
      case 'PENDING':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl">
                  Order #{orderStatus.orderNumber}
                </CardTitle>
                <CardDescription>
                  {orderStatus.merchant.name}
                </CardDescription>
              </div>
              <Badge variant={getStatusColor(orderStatus.status)} className="text-sm">
                {orderStatus.statusMessage}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Progress Bar */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Progress</span>
                  <span className="text-sm text-muted-foreground">
                    {orderStatus.progress}%
                  </span>
                </div>
                <Progress value={orderStatus.progress} className="h-2" />
                {orderStatus.estimatedTime && (
                  <p className="text-sm text-muted-foreground mt-2">
                    <Clock className="h-4 w-4 inline mr-1" />
                    Estimated time: {orderStatus.estimatedTime}
                  </p>
                )}
              </div>

              {/* Order Type */}
              <div className="flex items-center gap-2 text-sm">
                <Package className="h-4 w-4 text-muted-foreground" />
                <span className="capitalize">{orderStatus.orderType}</span>
                {orderStatus.customerName && (
                  <>
                    <span className="text-muted-foreground">•</span>
                    <span>{orderStatus.customerName}</span>
                  </>
                )}
              </div>

              {/* Last Updated */}
              <p className="text-xs text-muted-foreground">
                Last updated: {lastUpdate.toLocaleTimeString()}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Order Items */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Order Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {orderStatus.items.map((item: any, index: number) => (
                <div
                  key={index}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-medium">{item.quantity}x</span>
                    <span>{item.name}</span>
                  </div>
                  <span className="font-medium">${item.price}</span>
                </div>
              ))}
              <div className="flex items-center justify-between pt-3 border-t font-bold text-lg">
                <span>Total</span>
                <span>${orderStatus.total}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Kitchen Status */}
        {orderStatus.kitchenItems && orderStatus.kitchenItems.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ChefHat className="h-5 w-5" />
                Kitchen Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {orderStatus.kitchenItems.map((item: any, index: number) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="font-medium">{item.quantity}x</span>
                      <div>
                        <p>{item.name}</p>
                        {item.station && (
                          <p className="text-xs text-muted-foreground">
                            {item.station}
                          </p>
                        )}
                      </div>
                    </div>
                    <Badge
                      variant={item.status === 'BUMPED' ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {item.status === 'BUMPED' ? (
                        <>
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Ready
                        </>
                      ) : item.status === 'PREPARING' ? (
                        'Preparing'
                      ) : (
                        'Pending'
                      )}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Delivery Status */}
        {orderStatus.delivery && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5" />
                Delivery Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Status</span>
                  <Badge variant="secondary">
                    {orderStatus.delivery.status.replace('_', ' ')}
                  </Badge>
                </div>

                {orderStatus.delivery.driverName && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Driver</span>
                      <span className="text-sm">{orderStatus.delivery.driverName}</span>
                    </div>

                    {orderStatus.delivery.driverPhone && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Contact</span>
                        <a
                          href={`tel:${orderStatus.delivery.driverPhone}`}
                          className="text-sm text-primary hover:underline flex items-center gap-1"
                        >
                          <Phone className="h-3 w-3" />
                          {orderStatus.delivery.driverPhone}
                        </a>
                      </div>
                    )}

                    {orderStatus.delivery.vehicle && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Vehicle</span>
                        <span className="text-sm">
                          {orderStatus.delivery.vehicle} •{' '}
                          {orderStatus.delivery.licensePlate}
                        </span>
                      </div>
                    )}
                  </>
                )}

                {orderStatus.delivery.deliveryAddress && (
                  <div className="pt-3 border-t">
                    <p className="text-sm font-medium mb-2 flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Delivery Address
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {orderStatus.delivery.deliveryAddress}
                    </p>
                  </div>
                )}

                {orderStatus.delivery.trackingCode && (
                  <div className="pt-3">
                    <a
                      href={`/track/${orderStatus.delivery.trackingCode}`}
                      className="text-sm text-primary hover:underline flex items-center gap-2"
                    >
                      <Truck className="h-4 w-4" />
                      Track delivery on map
                    </a>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Merchant Contact */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              Need Help?
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <p>Contact {orderStatus.merchant.name}:</p>
              {orderStatus.merchant.phone && (
                <a
                  href={`tel:${orderStatus.merchant.phone}`}
                  className="text-primary hover:underline flex items-center gap-2"
                >
                  <Phone className="h-4 w-4" />
                  {orderStatus.merchant.phone}
                </a>
              )}
              {orderStatus.merchant.address && (
                <p className="text-muted-foreground flex items-start gap-2">
                  <MapPin className="h-4 w-4 mt-0.5" />
                  {orderStatus.merchant.address}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
