import Layout from "@/components/Layout";
import { getPageBySlug } from "@/data/pages";
import { useEcommerceContent } from "@/contexts/EcommerceContentContext";

function stripWpComments(text: string): string {
  return text.replace(/<!-- \/?(?:wp:[^>]+) -->/g, "").trim();
}

export default function TermsPage() {
  const ecommerce = useEcommerceContent();
  const page = ecommerce?.getPageBySlug?.("terms-and-conditions") ?? getPageBySlug("terms-and-conditions");
  const rawContent = page?.content ?? "";
  const cleaned = stripWpComments(rawContent)
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");
  // Content is truncated at "using log" - append standard log files text for completeness
  const fullContent = cleaned.endsWith("using log")
    ? cleaned + " files. These files log visitors when they visit websites. All hosting companies do this as part of hosting services' analytics. The information collected includes internet protocol (IP) addresses, browser type, Internet Service Provider (ISP), date and time stamp, referring/exit pages, and possibly the number of clicks. These are not linked to any personally identifiable information."
    : cleaned;

  return (
    <Layout>
      <section className="relative py-16 lg:py-24 bg-gradient-to-b from-[#1a1510] to-background">
        <div className="container text-center">
          <p className="text-gold text-xs font-medium tracking-[0.2em] uppercase mb-3">Legal</p>
          <h1 className="font-serif text-4xl lg:text-5xl font-bold mb-4">Terms & Conditions</h1>
        </div>
      </section>
      <section className="py-12 lg:py-16">
        <div
          className="container max-w-3xl prose prose-invert prose-headings:font-serif prose-headings:text-foreground prose-p:text-muted-foreground prose-p:text-sm prose-p:leading-relaxed prose-h3:text-xl prose-h4:text-lg"
          dangerouslySetInnerHTML={{ __html: fullContent }}
        />
      </section>
    </Layout>
  );
}
