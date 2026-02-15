import Layout from "@/components/Layout";

export default function ShippingPage() {
  return (
    <Layout>
      <section className="relative py-16 lg:py-24 bg-gradient-to-b from-[#1a1510] to-background">
        <div className="container text-center">
          <p className="text-gold text-xs font-medium tracking-[0.2em] uppercase mb-3">Policies</p>
          <h1 className="font-serif text-4xl lg:text-5xl font-bold mb-4">Shipping & Returns</h1>
        </div>
      </section>
      <section className="py-12 lg:py-16">
        <div className="container max-w-3xl space-y-8 text-sm text-muted-foreground leading-relaxed">
          <div>
            <h2 className="font-serif text-2xl font-bold text-foreground mb-4">Shipping Information</h2>
            <p className="mb-4">All swords are carefully packaged in custom boxes to ensure safe delivery. Most orders ship within 2-4 weeks as each sword is individually hand forged to order.</p>
            <p className="mb-4">We offer free shipping on all orders over $500 within North America. Orders under $500 are subject to standard shipping rates based on destination and weight.</p>
            <p>We ship worldwide via UPS and FedEx. International customers may be responsible for import duties, taxes, and customs fees upon delivery. These charges are not included in the product price or shipping cost.</p>
          </div>
          <div>
            <h2 className="font-serif text-2xl font-bold text-foreground mb-4">Return Policy</h2>
            <p className="mb-4">We accept returns within 30 days of delivery for unused items in their original packaging. The item must be in the same condition as when received.</p>
            <p className="mb-4">Custom orders and personalized items are non-refundable. Please contact us before initiating a return to receive a Return Authorization number.</p>
            <p>Return shipping costs are the responsibility of the buyer unless the item was received damaged or defective. Refunds will be processed within 5-7 business days of receiving the returned item.</p>
          </div>
          <div>
            <h2 className="font-serif text-2xl font-bold text-foreground mb-4">Damaged Items</h2>
            <p>If your order arrives damaged, please contact us within 48 hours of delivery with photos of the damage. We will arrange a replacement or full refund at no additional cost.</p>
          </div>
        </div>
      </section>
    </Layout>
  );
}
