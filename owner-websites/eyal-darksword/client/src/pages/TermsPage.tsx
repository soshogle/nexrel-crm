import Layout from "@/components/Layout";

export default function TermsPage() {
  return (
    <Layout>
      <section className="relative py-16 lg:py-24 bg-gradient-to-b from-[#1a1510] to-background">
        <div className="container text-center">
          <p className="text-gold text-xs font-medium tracking-[0.2em] uppercase mb-3">Legal</p>
          <h1 className="font-serif text-4xl lg:text-5xl font-bold mb-4">Terms & Conditions</h1>
        </div>
      </section>
      <section className="py-12 lg:py-16">
        <div className="container max-w-3xl space-y-6 text-sm text-muted-foreground leading-relaxed">
          <p>By accessing and using the Darksword Armory website, you agree to be bound by these Terms and Conditions. Please read them carefully before making a purchase.</p>
          <h2 className="font-serif text-xl font-bold text-foreground pt-2">Products</h2>
          <p>All products sold by Darksword Armory are intended for collectors, martial arts practitioners, and historical enthusiasts. Buyers must be of legal age to purchase edged weapons in their jurisdiction. It is the buyer's responsibility to ensure compliance with local laws regarding the purchase, possession, and import of swords and edged weapons.</p>
          <h2 className="font-serif text-xl font-bold text-foreground pt-2">Pricing</h2>
          <p>All prices are listed in US Dollars (USD). Prices are subject to change without notice. We reserve the right to correct pricing errors. If an item's correct price is higher than the listed price, we will contact you before processing the order.</p>
          <h2 className="font-serif text-xl font-bold text-foreground pt-2">Orders</h2>
          <p>By placing an order, you are making an offer to purchase. We reserve the right to accept or decline any order. Orders are confirmed via email. Production times vary as each sword is individually hand forged.</p>
          <h2 className="font-serif text-xl font-bold text-foreground pt-2">Limitation of Liability</h2>
          <p>Darksword Armory shall not be liable for any injury, damage, or loss resulting from the use or misuse of our products. All products are sold as-is for their intended purpose. Use of our swords and weapons is at the buyer's own risk.</p>
          <h2 className="font-serif text-xl font-bold text-foreground pt-2">Contact</h2>
          <p>For questions about these terms, please contact us at info@darksword-armory.com or call 1-877-537-6937.</p>
        </div>
      </section>
    </Layout>
  );
}
