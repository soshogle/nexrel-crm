import Layout from "@/components/Layout";
import { Link } from "wouter";
import { LogIn, Loader2 } from "lucide-react";
import { useState } from "react";

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const url = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const body = mode === "login"
        ? { email, password }
        : { email, password, name: name || undefined };
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Something went wrong");
        return;
      }
      const redirect = data.redirect || "/";
      window.location.href = redirect;
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <section className="relative py-16 lg:py-24 bg-gradient-to-b from-[#1a1510] to-background">
        <div className="container text-center">
          <h1 className="font-serif text-4xl lg:text-5xl font-bold mb-4">
            {mode === "login" ? "Sign In" : "Create Account"}
          </h1>
        </div>
      </section>
      <section className="py-12 lg:py-16">
        <div className="container max-w-md mx-auto">
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "register" && (
              <div>
                <label className="block text-sm font-medium mb-1 text-muted-foreground">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-secondary border border-border text-foreground focus:border-gold outline-none"
                  placeholder="Your name"
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium mb-1 text-muted-foreground">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2.5 bg-secondary border border-border text-foreground focus:border-gold outline-none"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-muted-foreground">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={mode === "register" ? 6 : 1}
                className="w-full px-4 py-2.5 bg-secondary border border-border text-foreground focus:border-gold outline-none"
                placeholder={mode === "register" ? "Min 6 characters" : "••••••••"}
              />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-8 py-3.5 bg-gold text-[#0D0D0D] text-sm font-semibold tracking-[0.1em] uppercase hover:bg-gold-light transition-colors disabled:opacity-60"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
              {mode === "login" ? "Sign In" : "Create Account"}
            </button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            {mode === "login" ? (
              <>Don&apos;t have an account?{" "}
                <button type="button" onClick={() => { setMode("register"); setError(""); }} className="text-gold hover:underline">
                  Create one
                </button>
              </>
            ) : (
              <>Already have an account?{" "}
                <button type="button" onClick={() => { setMode("login"); setError(""); }} className="text-gold hover:underline">
                  Sign in
                </button>
              </>
            )}
          </p>
        </div>
      </section>
      <section className="py-8 border-t border-border">
        <div className="container max-w-3xl text-center">
          <h2 className="font-serif text-lg font-semibold mb-2">Guest Checkout Available</h2>
          <p className="text-muted-foreground text-sm mb-4">
            You can browse products, add to cart, and complete checkout without creating an account.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/shop"
              className="inline-flex items-center justify-center px-6 py-2.5 border border-gold text-gold text-sm font-semibold tracking-[0.1em] uppercase hover:bg-gold/10 transition-colors"
            >
              Browse Products
            </Link>
            <Link
              href="/cart"
              className="inline-flex items-center justify-center px-6 py-2.5 border border-gold text-gold text-sm font-semibold tracking-[0.1em] uppercase hover:bg-gold/10 transition-colors"
            >
              View Cart
            </Link>
          </div>
        </div>
      </section>
    </Layout>
  );
}
