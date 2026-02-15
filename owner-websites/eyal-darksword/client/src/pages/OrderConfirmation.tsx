import { Link, useParams } from 'wouter';
import { trpc } from '@/lib/trpc';
import { CheckCircle, Package, Truck, Mail, ArrowRight } from 'lucide-react';
import AnnouncementBar from '@/components/AnnouncementBar';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function OrderConfirmation() {
  const { orderNumber } = useParams<{ orderNumber: string }>();
  const orderQuery = trpc.orders.getByNumber.useQuery(
    { orderNumber: orderNumber || '' },
    { enabled: !!orderNumber }
  );

  const order = orderQuery.data;

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-[#FAF3E0]">
      <AnnouncementBar />
      <Header />

      <div className="max-w-3xl mx-auto px-4 py-16">
        {orderQuery.isLoading ? (
          <div className="text-center py-20">
            <div className="w-12 h-12 border-2 border-[#C9A84C] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-[#FAF3E0]/60">Loading order details...</p>
          </div>
        ) : order ? (
          <div className="space-y-8">
            {/* Success Header */}
            <div className="text-center space-y-4">
              <CheckCircle className="w-20 h-20 text-green-500 mx-auto" />
              <h1 className="text-3xl font-serif text-[#C9A84C]">Order Confirmed!</h1>
              <p className="text-[#FAF3E0]/60">
                Thank you for your order. We've received your request and will begin processing it shortly.
              </p>
            </div>

            {/* Order Details Card */}
            <div className="bg-[#1A1A1A] border border-[#C9A84C]/20 rounded-lg p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-[#C9A84C]/10 pb-4">
                <div>
                  <p className="text-sm text-[#FAF3E0]/50">Order Number</p>
                  <p className="text-[#C9A84C] font-mono text-lg font-bold">{order.orderNumber}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-[#FAF3E0]/50">Order Total</p>
                  <p className="text-[#C9A84C] text-xl font-serif font-bold">${order.total}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-[#FAF3E0]/50 mb-1">Status</p>
                  <span className="inline-block px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded text-sm font-medium capitalize">
                    {order.status}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-[#FAF3E0]/50 mb-1">Payment Status</p>
                  <span className="inline-block px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded text-sm font-medium capitalize">
                    {order.paymentStatus}
                  </span>
                </div>
              </div>

              {/* Order Items */}
              {order.items && order.items.length > 0 && (
                <div className="border-t border-[#C9A84C]/10 pt-4">
                  <h3 className="text-sm text-[#FAF3E0]/50 mb-3">Items Ordered</h3>
                  <div className="space-y-3">
                    {order.items.map((item: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center">
                        <div>
                          <p className="text-[#FAF3E0] text-sm">{item.productName}</p>
                          <p className="text-xs text-[#FAF3E0]/40">Qty: {item.quantity}</p>
                        </div>
                        <p className="text-[#C9A84C] font-semibold">${item.total}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Shipping Address */}
              {order.shippingAddress && (
                <div className="border-t border-[#C9A84C]/10 pt-4">
                  <h3 className="text-sm text-[#FAF3E0]/50 mb-2">Shipping To</h3>
                  <p className="text-[#FAF3E0] text-sm">
                    {(order.shippingAddress as any).firstName} {(order.shippingAddress as any).lastName}<br />
                    {(order.shippingAddress as any).address1}<br />
                    {(order.shippingAddress as any).city}, {(order.shippingAddress as any).state} {(order.shippingAddress as any).postalCode}
                  </p>
                </div>
              )}
            </div>

            {/* What's Next */}
            <div className="bg-[#1A1A1A] border border-[#C9A84C]/20 rounded-lg p-6">
              <h3 className="text-lg font-serif text-[#C9A84C] mb-4">What Happens Next</h3>
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-[#C9A84C]/20 flex items-center justify-center flex-shrink-0">
                    <Mail className="w-5 h-5 text-[#C9A84C]" />
                  </div>
                  <div>
                    <p className="text-[#FAF3E0] font-medium">Confirmation Email</p>
                    <p className="text-sm text-[#FAF3E0]/50">You'll receive an email confirmation at {order.customerEmail}</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-[#C9A84C]/20 flex items-center justify-center flex-shrink-0">
                    <Package className="w-5 h-5 text-[#C9A84C]" />
                  </div>
                  <div>
                    <p className="text-[#FAF3E0] font-medium">Order Processing</p>
                    <p className="text-sm text-[#FAF3E0]/50">Our craftsmen will begin preparing your order within 1-2 business days</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-[#C9A84C]/20 flex items-center justify-center flex-shrink-0">
                    <Truck className="w-5 h-5 text-[#C9A84C]" />
                  </div>
                  <div>
                    <p className="text-[#FAF3E0] font-medium">Shipping</p>
                    <p className="text-sm text-[#FAF3E0]/50">You'll receive tracking information once your order ships</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/shop"
                className="px-8 py-3 bg-[#C9A84C] text-[#0D0D0D] font-bold rounded hover:bg-[#B8973F] transition-colors text-center flex items-center justify-center gap-2"
              >
                Continue Shopping <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/account"
                className="px-8 py-3 border border-[#C9A84C]/40 text-[#C9A84C] font-semibold rounded hover:bg-[#C9A84C]/10 transition-colors text-center"
              >
                View My Orders
              </Link>
            </div>
          </div>
        ) : (
          <div className="text-center py-20">
            <p className="text-[#FAF3E0]/60 text-lg">Order not found</p>
            <Link href="/shop" className="text-[#C9A84C] hover:underline mt-4 inline-block">
              Return to Shop
            </Link>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
