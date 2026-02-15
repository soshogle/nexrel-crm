import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { useCart } from '@/contexts/CartContext';
import { trpc } from '@/lib/trpc';
import { ChevronRight, Shield, Truck, Lock, CreditCard } from 'lucide-react';
import AnnouncementBar from '@/components/AnnouncementBar';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

interface AddressForm {
  firstName: string;
  lastName: string;
  company: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone: string;
}

const emptyAddress: AddressForm = {
  firstName: '', lastName: '', company: '', address1: '', address2: '',
  city: '', state: '', postalCode: '', country: 'US', phone: '',
};

export default function CheckoutPage() {
  const { items, total, count, cartId, sessionId, clearCart } = useCart();
  const [, navigate] = useLocation();
  const [step, setStep] = useState<'info' | 'shipping' | 'payment'>('info');
  const [email, setEmail] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [shippingAddress, setShippingAddress] = useState<AddressForm>(emptyAddress);
  const [billingAddress, setBillingAddress] = useState<AddressForm>(emptyAddress);
  const [sameAsShipping, setSameAsShipping] = useState(true);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const createOrderMutation = trpc.orders.create.useMutation();

  const subtotal = parseFloat(total);
  const shippingCost = subtotal >= 300 ? 0 : 25;
  const orderTotal = subtotal + shippingCost;

  const updateShipping = (field: keyof AddressForm, value: string) => {
    setShippingAddress(prev => ({ ...prev, [field]: value }));
  };

  const updateBilling = (field: keyof AddressForm, value: string) => {
    setBillingAddress(prev => ({ ...prev, [field]: value }));
  };

  const handlePlaceOrder = async () => {
    setError('');
    setIsSubmitting(true);

    try {
      const billing = sameAsShipping ? shippingAddress : billingAddress;
      const result = await createOrderMutation.mutateAsync({
        sessionId,
        customerEmail: email,
        customerName: customerName || `${shippingAddress.firstName} ${shippingAddress.lastName}`,
        customerPhone: phone || shippingAddress.phone,
        shippingAddress,
        billingAddress: billing,
        paymentMethod: 'elavon',
        notes,
      });

      navigate(`/order-confirmation/${result.orderNumber}`);
    } catch (err: any) {
      setError(err.message || 'Failed to place order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] text-[#FAF3E0]">
        <AnnouncementBar />
        <Header />
        <div className="max-w-4xl mx-auto px-4 py-20 text-center">
          <h1 className="text-3xl font-serif text-[#C9A84C] mb-4">Your Cart is Empty</h1>
          <p className="text-[#FAF3E0]/60 mb-8">Add some items before proceeding to checkout.</p>
          <Link href="/shop" className="inline-block px-8 py-3 bg-[#C9A84C] text-[#0D0D0D] font-bold rounded hover:bg-[#B8973F] transition-colors">
            Continue Shopping
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-[#FAF3E0]">
      <AnnouncementBar />
      <Header />

      {/* Breadcrumb */}
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center gap-2 text-sm text-[#FAF3E0]/50">
          <Link href="/cart" className="hover:text-[#C9A84C]">Cart</Link>
          <ChevronRight className="w-4 h-4" />
          <span className={step === 'info' ? 'text-[#C9A84C]' : 'hover:text-[#C9A84C] cursor-pointer'} onClick={() => setStep('info')}>Information</span>
          <ChevronRight className="w-4 h-4" />
          <span className={step === 'shipping' ? 'text-[#C9A84C]' : step === 'payment' ? 'hover:text-[#C9A84C] cursor-pointer' : 'text-[#FAF3E0]/30'} onClick={() => step !== 'info' && setStep('shipping')}>Shipping</span>
          <ChevronRight className="w-4 h-4" />
          <span className={step === 'payment' ? 'text-[#C9A84C]' : 'text-[#FAF3E0]/30'}>Payment</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">
          {/* Left - Form */}
          <div className="lg:col-span-3 space-y-8">
            {/* Contact Information */}
            {step === 'info' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-serif text-[#C9A84C]">Contact Information</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-[#FAF3E0]/70 mb-1">Email Address *</label>
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#C9A84C]/20 rounded text-[#FAF3E0] focus:border-[#C9A84C] focus:outline-none"
                      placeholder="your@email.com"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-[#FAF3E0]/70 mb-1">First Name *</label>
                      <input
                        type="text"
                        value={shippingAddress.firstName}
                        onChange={e => updateShipping('firstName', e.target.value)}
                        className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#C9A84C]/20 rounded text-[#FAF3E0] focus:border-[#C9A84C] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-[#FAF3E0]/70 mb-1">Last Name *</label>
                      <input
                        type="text"
                        value={shippingAddress.lastName}
                        onChange={e => updateShipping('lastName', e.target.value)}
                        className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#C9A84C]/20 rounded text-[#FAF3E0] focus:border-[#C9A84C] focus:outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-[#FAF3E0]/70 mb-1">Phone</label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#C9A84C]/20 rounded text-[#FAF3E0] focus:border-[#C9A84C] focus:outline-none"
                    />
                  </div>
                </div>

                <h2 className="text-2xl font-serif text-[#C9A84C] pt-4">Shipping Address</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-[#FAF3E0]/70 mb-1">Company (optional)</label>
                    <input
                      type="text"
                      value={shippingAddress.company}
                      onChange={e => updateShipping('company', e.target.value)}
                      className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#C9A84C]/20 rounded text-[#FAF3E0] focus:border-[#C9A84C] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-[#FAF3E0]/70 mb-1">Address *</label>
                    <input
                      type="text"
                      value={shippingAddress.address1}
                      onChange={e => updateShipping('address1', e.target.value)}
                      className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#C9A84C]/20 rounded text-[#FAF3E0] focus:border-[#C9A84C] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-[#FAF3E0]/70 mb-1">Apartment, suite, etc. (optional)</label>
                    <input
                      type="text"
                      value={shippingAddress.address2}
                      onChange={e => updateShipping('address2', e.target.value)}
                      className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#C9A84C]/20 rounded text-[#FAF3E0] focus:border-[#C9A84C] focus:outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm text-[#FAF3E0]/70 mb-1">City *</label>
                      <input
                        type="text"
                        value={shippingAddress.city}
                        onChange={e => updateShipping('city', e.target.value)}
                        className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#C9A84C]/20 rounded text-[#FAF3E0] focus:border-[#C9A84C] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-[#FAF3E0]/70 mb-1">State *</label>
                      <input
                        type="text"
                        value={shippingAddress.state}
                        onChange={e => updateShipping('state', e.target.value)}
                        className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#C9A84C]/20 rounded text-[#FAF3E0] focus:border-[#C9A84C] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-[#FAF3E0]/70 mb-1">ZIP Code *</label>
                      <input
                        type="text"
                        value={shippingAddress.postalCode}
                        onChange={e => updateShipping('postalCode', e.target.value)}
                        className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#C9A84C]/20 rounded text-[#FAF3E0] focus:border-[#C9A84C] focus:outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-[#FAF3E0]/70 mb-1">Country *</label>
                    <select
                      value={shippingAddress.country}
                      onChange={e => updateShipping('country', e.target.value)}
                      className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#C9A84C]/20 rounded text-[#FAF3E0] focus:border-[#C9A84C] focus:outline-none"
                    >
                      <option value="US">United States</option>
                      <option value="CA">Canada</option>
                      <option value="GB">United Kingdom</option>
                      <option value="AU">Australia</option>
                      <option value="DE">Germany</option>
                      <option value="FR">France</option>
                    </select>
                  </div>
                </div>

                <button
                  onClick={() => setStep('shipping')}
                  disabled={!email || !shippingAddress.firstName || !shippingAddress.lastName || !shippingAddress.address1 || !shippingAddress.city || !shippingAddress.state || !shippingAddress.postalCode}
                  className="w-full py-4 bg-[#C9A84C] text-[#0D0D0D] font-bold rounded hover:bg-[#B8973F] transition-colors uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continue to Shipping
                </button>
              </div>
            )}

            {/* Shipping Method */}
            {step === 'shipping' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-serif text-[#C9A84C]">Shipping Method</h2>

                <div className="bg-[#1A1A1A] border border-[#C9A84C]/20 rounded-lg p-4 space-y-3">
                  <p className="text-sm text-[#FAF3E0]/60">Shipping to: {shippingAddress.firstName} {shippingAddress.lastName}, {shippingAddress.address1}, {shippingAddress.city}, {shippingAddress.state} {shippingAddress.postalCode}</p>
                  <button onClick={() => setStep('info')} className="text-sm text-[#C9A84C] hover:underline">Change</button>
                </div>

                <div className="space-y-3">
                  <label className="flex items-center justify-between p-4 bg-[#1A1A1A] border-2 border-[#C9A84C] rounded-lg cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full border-2 border-[#C9A84C] flex items-center justify-center">
                        <div className="w-2.5 h-2.5 rounded-full bg-[#C9A84C]" />
                      </div>
                      <div>
                        <p className="text-[#FAF3E0] font-medium">Standard Shipping</p>
                        <p className="text-sm text-[#FAF3E0]/50">5-10 business days</p>
                      </div>
                    </div>
                    <span className="text-[#C9A84C] font-semibold">
                      {shippingCost === 0 ? 'FREE' : `$${shippingCost.toFixed(2)}`}
                    </span>
                  </label>
                </div>

                {subtotal < 300 && (
                  <p className="text-sm text-[#C9A84C]/70 flex items-center gap-2">
                    <Truck className="w-4 h-4" />
                    Add ${(300 - subtotal).toFixed(2)} more for free shipping
                  </p>
                )}

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={sameAsShipping}
                    onChange={e => setSameAsShipping(e.target.checked)}
                    className="w-5 h-5 accent-[#C9A84C]"
                  />
                  <label className="text-[#FAF3E0]/70">Billing address same as shipping</label>
                </div>

                {!sameAsShipping && (
                  <div className="space-y-4 border-t border-[#C9A84C]/20 pt-6">
                    <h3 className="text-xl font-serif text-[#C9A84C]">Billing Address</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-[#FAF3E0]/70 mb-1">First Name *</label>
                        <input type="text" value={billingAddress.firstName} onChange={e => updateBilling('firstName', e.target.value)} className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#C9A84C]/20 rounded text-[#FAF3E0] focus:border-[#C9A84C] focus:outline-none" />
                      </div>
                      <div>
                        <label className="block text-sm text-[#FAF3E0]/70 mb-1">Last Name *</label>
                        <input type="text" value={billingAddress.lastName} onChange={e => updateBilling('lastName', e.target.value)} className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#C9A84C]/20 rounded text-[#FAF3E0] focus:border-[#C9A84C] focus:outline-none" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm text-[#FAF3E0]/70 mb-1">Address *</label>
                      <input type="text" value={billingAddress.address1} onChange={e => updateBilling('address1', e.target.value)} className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#C9A84C]/20 rounded text-[#FAF3E0] focus:border-[#C9A84C] focus:outline-none" />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm text-[#FAF3E0]/70 mb-1">City *</label>
                        <input type="text" value={billingAddress.city} onChange={e => updateBilling('city', e.target.value)} className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#C9A84C]/20 rounded text-[#FAF3E0] focus:border-[#C9A84C] focus:outline-none" />
                      </div>
                      <div>
                        <label className="block text-sm text-[#FAF3E0]/70 mb-1">State *</label>
                        <input type="text" value={billingAddress.state} onChange={e => updateBilling('state', e.target.value)} className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#C9A84C]/20 rounded text-[#FAF3E0] focus:border-[#C9A84C] focus:outline-none" />
                      </div>
                      <div>
                        <label className="block text-sm text-[#FAF3E0]/70 mb-1">ZIP Code *</label>
                        <input type="text" value={billingAddress.postalCode} onChange={e => updateBilling('postalCode', e.target.value)} className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#C9A84C]/20 rounded text-[#FAF3E0] focus:border-[#C9A84C] focus:outline-none" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm text-[#FAF3E0]/70 mb-1">Country *</label>
                      <select value={billingAddress.country} onChange={e => updateBilling('country', e.target.value)} className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#C9A84C]/20 rounded text-[#FAF3E0] focus:border-[#C9A84C] focus:outline-none">
                        <option value="US">United States</option>
                        <option value="CA">Canada</option>
                        <option value="GB">United Kingdom</option>
                        <option value="AU">Australia</option>
                      </select>
                    </div>
                  </div>
                )}

                <button
                  onClick={() => setStep('payment')}
                  className="w-full py-4 bg-[#C9A84C] text-[#0D0D0D] font-bold rounded hover:bg-[#B8973F] transition-colors uppercase tracking-wider"
                >
                  Continue to Payment
                </button>
              </div>
            )}

            {/* Payment */}
            {step === 'payment' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-serif text-[#C9A84C]">Payment</h2>

                <div className="bg-[#1A1A1A] border border-[#C9A84C]/20 rounded-lg p-6 space-y-4">
                  <div className="flex items-center gap-3 mb-4">
                    <CreditCard className="w-6 h-6 text-[#C9A84C]" />
                    <span className="text-[#FAF3E0] font-medium">Credit / Debit Card</span>
                    <span className="text-xs text-[#FAF3E0]/40 ml-auto">Powered by Elavon</span>
                  </div>

                  {/* Elavon Lightbox placeholder - will be replaced with actual Elavon integration */}
                  <div className="border-2 border-dashed border-[#C9A84C]/30 rounded-lg p-8 text-center">
                    <Lock className="w-10 h-10 text-[#C9A84C]/50 mx-auto mb-3" />
                    <p className="text-[#FAF3E0]/60 text-sm">
                      Secure payment form will appear here via Elavon Converge Lightbox.
                    </p>
                    <p className="text-[#FAF3E0]/40 text-xs mt-2">
                      Your card details are processed securely by Elavon and never stored on our servers.
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-[#FAF3E0]/70 mb-1">Order Notes (optional)</label>
                  <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#C9A84C]/20 rounded text-[#FAF3E0] focus:border-[#C9A84C] focus:outline-none resize-none"
                    placeholder="Special instructions for your order..."
                  />
                </div>

                {error && (
                  <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-4 text-red-300 text-sm">
                    {error}
                  </div>
                )}

                <button
                  onClick={handlePlaceOrder}
                  disabled={isSubmitting}
                  className="w-full py-4 bg-[#C9A84C] text-[#0D0D0D] font-bold rounded hover:bg-[#B8973F] transition-colors uppercase tracking-wider disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-[#0D0D0D] border-t-transparent rounded-full animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      Place Order — ${orderTotal.toFixed(2)}
                    </>
                  )}
                </button>

                <div className="flex items-center justify-center gap-6 text-xs text-[#FAF3E0]/40">
                  <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> SSL Encrypted</span>
                  <span className="flex items-center gap-1"><Lock className="w-3 h-3" /> PCI Compliant</span>
                  <span className="flex items-center gap-1"><CreditCard className="w-3 h-3" /> Secure Payment</span>
                </div>
              </div>
            )}
          </div>

          {/* Right - Order Summary */}
          <div className="lg:col-span-2">
            <div className="bg-[#1A1A1A] border border-[#C9A84C]/20 rounded-lg p-6 sticky top-6">
              <h3 className="text-lg font-serif text-[#C9A84C] mb-4">Order Summary</h3>

              <div className="space-y-4 max-h-80 overflow-y-auto mb-4">
                {items.map(item => (
                  <div key={item.id} className="flex gap-3">
                    <div className="w-16 h-16 bg-[#2A2A2A] rounded overflow-hidden flex-shrink-0 relative">
                      {item.product?.imageUrl && (
                        <img src={item.product.imageUrl} alt="" className="w-full h-full object-cover" />
                      )}
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#C9A84C] text-[#0D0D0D] text-xs font-bold rounded-full flex items-center justify-center">
                        {item.quantity}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[#FAF3E0] truncate">{item.product?.name}</p>
                      {item.variationDetails && Object.entries(item.variationDetails).map(([k, v]) => (
                        <p key={k} className="text-xs text-[#FAF3E0]/40">{k}: {v}</p>
                      ))}
                    </div>
                    <p className="text-sm text-[#C9A84C] font-semibold whitespace-nowrap">
                      ${(parseFloat(item.price) * item.quantity).toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>

              <div className="border-t border-[#C9A84C]/20 pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-[#FAF3E0]/60">Subtotal ({count} items)</span>
                  <span className="text-[#FAF3E0]">${total}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#FAF3E0]/60">Shipping</span>
                  <span className="text-[#FAF3E0]">{shippingCost === 0 ? 'FREE' : `$${shippingCost.toFixed(2)}`}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#FAF3E0]/60">Tax</span>
                  <span className="text-[#FAF3E0]">Calculated at checkout</span>
                </div>
                <div className="border-t border-[#C9A84C]/20 pt-3 flex justify-between">
                  <span className="text-[#FAF3E0] font-semibold">Total</span>
                  <span className="text-[#C9A84C] text-xl font-serif font-bold">${orderTotal.toFixed(2)}</span>
                </div>
              </div>

              {subtotal >= 300 && (
                <div className="mt-4 bg-[#C9A84C]/10 border border-[#C9A84C]/30 rounded p-3 flex items-center gap-2">
                  <Truck className="w-4 h-4 text-[#C9A84C]" />
                  <span className="text-sm text-[#C9A84C]">You qualify for free shipping!</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
