import { useState } from "react";
import Layout from "@/components/Layout";
import { ChevronDown } from "lucide-react";

const faqs = [
  { q: "What type of steel do you use?", a: "All of our swords are forged from 5160 high carbon spring steel. This steel is known for its excellent edge retention, flexibility, and durability. Our blades are heat treated to a hardness of 50-53 HRC." },
  { q: "Are your swords battle ready?", a: "Yes, all of our swords are fully functional and battle ready. They are designed for cutting, test cutting, and reenactment use. Each sword is individually tested before shipping." },
  { q: "How long does shipping take?", a: "Most orders ship within 2-4 weeks as each sword is individually hand forged. Shipping times vary by destination. We ship worldwide via UPS and FedEx." },
  { q: "Do you offer custom swords?", a: "Yes, we offer a semi-custom sword building service through our SwordMaker Workshop. You can customize blade length, hilt components, and grip wrapping to create your ideal sword." },
  { q: "What is your return policy?", a: "We accept returns within 30 days of delivery for unused items in original packaging. Custom orders are non-refundable. Please contact us before initiating a return." },
  { q: "Do you ship internationally?", a: "Yes, we ship to most countries worldwide. International customers may be responsible for import duties and taxes. Some countries have restrictions on importing swords, so please check your local laws." },
  { q: "How do I care for my sword?", a: "Keep your blade lightly oiled with mineral oil or Renaissance Wax to prevent rust. Store in a dry environment. After handling, wipe the blade to remove fingerprints and moisture." },
  { q: "What is peened construction?", a: "Peened construction means the pommel is permanently secured by peening (mushrooming) the tang of the blade over the pommel. This is the historically accurate and most durable method of sword assembly." },
  { q: "Do you offer payment plans?", a: "We accept all major credit cards, PayPal, and offer payment plans through select payment providers at checkout." },
  { q: "Can I visit your workshop?", a: "We occasionally offer workshop tours by appointment. Please contact us to inquire about availability." },
];

export default function FAQPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <Layout>
      <section className="relative py-16 lg:py-24 bg-gradient-to-b from-[#1a1510] to-background">
        <div className="container text-center">
          <p className="text-gold text-xs font-medium tracking-[0.2em] uppercase mb-3">Support</p>
          <h1 className="font-serif text-4xl lg:text-5xl font-bold mb-4">Frequently Asked Questions</h1>
          <p className="text-muted-foreground max-w-xl mx-auto">Find answers to common questions about our swords, ordering, and shipping.</p>
        </div>
      </section>

      <section className="py-12 lg:py-16">
        <div className="container max-w-3xl">
          <div className="space-y-0">
            {faqs.map((faq, i) => (
              <div key={i} className="border-b border-border">
                <button
                  onClick={() => setOpenIndex(openIndex === i ? null : i)}
                  className="w-full flex items-center justify-between py-5 text-left group"
                >
                  <span className="font-serif text-lg font-medium group-hover:text-gold transition-colors pr-4">{faq.q}</span>
                  <ChevronDown className={`w-5 h-5 shrink-0 text-gold transition-transform duration-300 ${openIndex === i ? "rotate-180" : ""}`} />
                </button>
                <div className={`overflow-hidden transition-all duration-300 ${openIndex === i ? "max-h-96 pb-5" : "max-h-0"}`}>
                  <p className="text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </Layout>
  );
}
