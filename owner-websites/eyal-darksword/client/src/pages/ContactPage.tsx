import { useState } from "react";
import Layout from "@/components/Layout";
import { toast } from "sonner";
import { Mail, Phone, MapPin } from "lucide-react";

export default function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Message sent! We'll get back to you shortly.");
    setForm({ name: "", email: "", subject: "", message: "" });
  };

  return (
    <Layout>
      <section className="relative py-16 lg:py-24 bg-gradient-to-b from-[#1a1510] to-background">
        <div className="container text-center">
          <p className="text-gold text-xs font-medium tracking-[0.2em] uppercase mb-3">Get In Touch</p>
          <h1 className="font-serif text-4xl lg:text-5xl font-bold mb-4">Contact Us</h1>
          <p className="text-muted-foreground max-w-xl mx-auto">Have a question about our swords or need help with an order? We'd love to hear from you.</p>
        </div>
      </section>

      <section className="py-12 lg:py-16">
        <div className="container">
          <div className="grid lg:grid-cols-3 gap-12 max-w-5xl mx-auto">
            <div className="space-y-8">
              <div className="flex gap-4">
                <div className="w-10 h-10 bg-gold/10 flex items-center justify-center shrink-0"><Mail className="w-5 h-5 text-gold" /></div>
                <div>
                  <h3 className="font-serif text-lg font-semibold mb-1">Email</h3>
                  <p className="text-sm text-muted-foreground">info@darksword-armory.com</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-10 h-10 bg-gold/10 flex items-center justify-center shrink-0"><Phone className="w-5 h-5 text-gold" /></div>
                <div>
                  <h3 className="font-serif text-lg font-semibold mb-1">Phone</h3>
                  <p className="text-sm text-muted-foreground">1-877-537-6937</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-10 h-10 bg-gold/10 flex items-center justify-center shrink-0"><MapPin className="w-5 h-5 text-gold" /></div>
                <div>
                  <h3 className="font-serif text-lg font-semibold mb-1">Location</h3>
                  <p className="text-sm text-muted-foreground">Montreal, Quebec, Canada</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="lg:col-span-2 space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <input type="text" placeholder="Your Name" required value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                  className="w-full px-4 py-3 bg-secondary border border-border text-foreground text-sm placeholder:text-muted-foreground focus:border-gold outline-none transition-colors" />
                <input type="email" placeholder="Your Email" required value={form.email} onChange={e => setForm({...form, email: e.target.value})}
                  className="w-full px-4 py-3 bg-secondary border border-border text-foreground text-sm placeholder:text-muted-foreground focus:border-gold outline-none transition-colors" />
              </div>
              <input type="text" placeholder="Subject" value={form.subject} onChange={e => setForm({...form, subject: e.target.value})}
                className="w-full px-4 py-3 bg-secondary border border-border text-foreground text-sm placeholder:text-muted-foreground focus:border-gold outline-none transition-colors" />
              <textarea placeholder="Your Message" required rows={6} value={form.message} onChange={e => setForm({...form, message: e.target.value})}
                className="w-full px-4 py-3 bg-secondary border border-border text-foreground text-sm placeholder:text-muted-foreground focus:border-gold outline-none transition-colors resize-none" />
              <button type="submit" className="px-8 py-3.5 bg-gold text-[#0D0D0D] text-sm font-semibold tracking-[0.1em] uppercase hover:bg-gold-light transition-colors">
                Send Message
              </button>
            </form>
          </div>
        </div>
      </section>
    </Layout>
  );
}
