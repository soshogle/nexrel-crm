import Layout from "@/components/Layout";
import { Link } from "wouter";
import { LogIn } from "lucide-react";

export default function LoginPage() {
  return (
    <Layout>
      <section className="relative py-16 lg:py-24 bg-gradient-to-b from-[#1a1510] to-background">
        <div className="container text-center">
          <h1 className="font-serif text-4xl lg:text-5xl font-bold mb-4">Sign In</h1>
        </div>
      </section>
      <section className="py-12 lg:py-16">
        <div className="container max-w-3xl text-center">
          <LogIn className="w-16 h-16 text-muted-foreground mx-auto mb-6" />
          <h2 className="font-serif text-2xl font-semibold mb-3">Guest Checkout Available</h2>
          <p className="text-muted-foreground mb-8">
            You can browse products, add to cart, and complete checkout without creating an account.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/shop"
              className="inline-flex items-center justify-center px-8 py-3.5 bg-gold text-[#0D0D0D] text-sm font-semibold tracking-[0.1em] uppercase hover:bg-gold-light transition-colors"
            >
              Browse Products
            </Link>
            <Link
              href="/cart"
              className="inline-flex items-center justify-center px-8 py-3.5 border border-gold text-gold text-sm font-semibold tracking-[0.1em] uppercase hover:bg-gold/10 transition-colors"
            >
              View Cart
            </Link>
          </div>
        </div>
      </section>
    </Layout>
  );
}
