
/**
 * Payment Checkout Page
 */

import { PaymentCheckoutForm } from '@/components/payments/payment-checkout-form';

export default function CheckoutPage() {
  return (
    <div className="container max-w-4xl py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Checkout</h1>
        <p className="text-muted-foreground mt-2">
          Complete your payment securely with Soshogle Pay
        </p>
      </div>

      <PaymentCheckoutForm />
    </div>
  );
}
