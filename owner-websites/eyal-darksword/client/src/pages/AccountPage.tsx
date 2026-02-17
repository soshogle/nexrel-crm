import Layout from "@/components/Layout";
import { Link } from "wouter";
import { User, Phone, Mail, MapPin } from "lucide-react";

export default function AccountPage() {
  return (
    <Layout>
      <section className="relative py-16 lg:py-24 bg-gradient-to-b from-[#1a1510] to-background">
        <div className="container text-center">
          <h1 className="font-serif text-4xl lg:text-5xl font-bold mb-4">My Account</h1>
        </div>
      </section>
      <section className="py-12 lg:py-16">
        <div className="container max-w-3xl">
          <div className="grid md:grid-cols-2 gap-8">
            <div className="text-center p-8 bg-card border border-border">
              <User className="w-16 h-16 text-muted-foreground mx-auto mb-6" />
              <h2 className="font-serif text-2xl font-semibold mb-3">Sign In</h2>
              <p className="text-muted-foreground text-sm mb-6">
                Account functionality will be available when connected to WooCommerce. In the meantime, browse our collection or contact us directly.
              </p>
              <Link
                href="/shop"
                className="inline-flex items-center px-8 py-3.5 bg-gold text-[#0D0D0D] text-sm font-semibold tracking-[0.1em] uppercase hover:bg-gold-light transition-colors"
              >
                Browse Products
              </Link>
            </div>
            <div className="p-8 bg-card border border-border">
              <h2 className="font-serif text-xl font-semibold mb-4">Contact Us</h2>
              <p className="text-muted-foreground text-sm mb-4">Need help with an order or have questions? Reach out:</p>
              <div className="space-y-3 text-sm">
                <p className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-gold flex-shrink-0" />
                  <span>438.238.2398</span>
                </p>
                <p className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-gold flex-shrink-0" />
                  <span>Toll-free: 1.877.226.4338 (U.S. & Canada)</span>
                </p>
                <p className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-gold flex-shrink-0" />
                  <a href="mailto:info@darksword-armory.com" className="text-gold hover:text-gold-light transition-colors">
                    info@darksword-armory.com
                  </a>
                </p>
                <p className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-gold flex-shrink-0 mt-0.5" />
                  <span>
                    Darksword Armory inc.
                    <br />
                    4612 Garand St.
                    <br />
                    St-Laurent, Quebec H4R-2A2
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}
