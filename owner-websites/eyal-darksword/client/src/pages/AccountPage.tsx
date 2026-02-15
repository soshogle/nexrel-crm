import Layout from "@/components/Layout";
import { Link } from "wouter";
import { User } from "lucide-react";

export default function AccountPage() {
  return (
    <Layout>
      <section className="relative py-16 lg:py-24 bg-gradient-to-b from-[#1a1510] to-background">
        <div className="container text-center">
          <h1 className="font-serif text-4xl lg:text-5xl font-bold mb-4">My Account</h1>
        </div>
      </section>
      <section className="py-12 lg:py-16">
        <div className="container max-w-3xl text-center">
          <User className="w-16 h-16 text-muted-foreground mx-auto mb-6" />
          <h2 className="font-serif text-2xl font-semibold mb-3">Sign In</h2>
          <p className="text-muted-foreground mb-8">Account functionality will be available when connected to WooCommerce.</p>
          <Link href="/shop" className="inline-flex items-center px-8 py-3.5 bg-gold text-[#0D0D0D] text-sm font-semibold tracking-[0.1em] uppercase hover:bg-gold-light transition-colors">
            Browse Products
          </Link>
        </div>
      </section>
    </Layout>
  );
}
