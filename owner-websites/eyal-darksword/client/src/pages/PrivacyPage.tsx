import Layout from "@/components/Layout";

export default function PrivacyPage() {
  return (
    <Layout>
      <section className="relative py-16 lg:py-24 bg-gradient-to-b from-[#1a1510] to-background">
        <div className="container text-center">
          <p className="text-gold text-xs font-medium tracking-[0.2em] uppercase mb-3">Legal</p>
          <h1 className="font-serif text-4xl lg:text-5xl font-bold mb-4">Privacy Policy</h1>
        </div>
      </section>
      <section className="py-12 lg:py-16">
        <div className="container max-w-3xl space-y-6 text-sm text-muted-foreground leading-relaxed">
          <p>Darksword Armory Inc. is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your personal information when you visit our website or make a purchase.</p>
          <h2 className="font-serif text-xl font-bold text-foreground pt-2">Information We Collect</h2>
          <p>We collect information you provide directly, such as your name, email address, shipping address, and payment information when you place an order. We also collect browsing data through cookies and analytics tools to improve your shopping experience.</p>
          <h2 className="font-serif text-xl font-bold text-foreground pt-2">How We Use Your Information</h2>
          <p>Your information is used to process orders, communicate about your purchases, improve our website and services, and send promotional materials if you have opted in to our mailing list.</p>
          <h2 className="font-serif text-xl font-bold text-foreground pt-2">Data Security</h2>
          <p>We implement industry-standard security measures to protect your personal information. All payment transactions are processed through secure, encrypted connections.</p>
          <h2 className="font-serif text-xl font-bold text-foreground pt-2">Contact Us</h2>
          <p>If you have questions about this Privacy Policy, please contact us at info@darksword-armory.com.</p>
        </div>
      </section>
    </Layout>
  );
}
