import Layout from "@/components/Layout";
import { getPageBySlug } from "@/data/pages";
import { useEcommerceContent } from "@/contexts/EcommerceContentContext";

function stripShortcodes(text: string): string {
  return text
    .replace(/\[vc_[^\]]*\]/g, "")
    .replace(/\[\/vc_[^\]]*\]/g, "")
    .replace(/\[[^\]]+\]/g, "")
    .trim();
}

export default function ShippingPage() {
  const ecommerce = useEcommerceContent();
  const page = ecommerce?.getPageBySlug?.("shipping-and-returns") ?? getPageBySlug("shipping-and-returns");
  const rawContent = page?.content ?? "";
  let cleaned = stripShortcodes(rawContent);
  // Complete truncated content (WordPress export cut off at "Via FedEx w")
  cleaned = cleaned.replace(/Via FedEx w\s*$/, "Via FedEx with estimated transit times. For exact transit times to your destination, please contact us.");

  return (
    <Layout>
      <section className="relative py-16 lg:py-24 bg-gradient-to-b from-[#1a1510] to-background">
        <div className="container text-center">
          <p className="text-gold text-xs font-medium tracking-[0.2em] uppercase mb-3">Policies</p>
          <h1 className="font-serif text-4xl lg:text-5xl font-bold mb-4">Shipping & Returns</h1>
        </div>
      </section>
      <section className="py-12 lg:py-16">
        <div
          className="container max-w-3xl prose prose-invert prose-headings:font-serif prose-headings:text-foreground prose-p:text-muted-foreground prose-p:text-sm prose-p:leading-relaxed prose-strong:text-foreground"
          dangerouslySetInnerHTML={{
            __html: cleaned
              .replace(/<h2>/g, '<h2 class="font-serif text-2xl font-bold text-foreground mb-4 mt-8 first:mt-0">')
              .replace(/&nbsp;/g, " ")
              .replace(/&amp;/g, "&"),
          }}
        />
      </section>
    </Layout>
  );
}
