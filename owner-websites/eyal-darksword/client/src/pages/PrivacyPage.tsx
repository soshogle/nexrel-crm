import Layout from "@/components/Layout";
import { getPageBySlug } from "@/data/pages";

function stripWpComments(text: string): string {
  return text.replace(/<!-- \/?(?:wp:[^>]+) -->/g, "").trim();
}

export default function PrivacyPage() {
  const page = getPageBySlug("privacy-policy-for-darksword-armory-inc");
  const rawContent = page?.content ?? "";
  const cleaned = stripWpComments(rawContent)
    .replace(/&nbsp;/g, " ")
    .replace(/`\s*$/, "."); // fix truncated ending

  return (
    <Layout>
      <section className="relative py-16 lg:py-24 bg-gradient-to-b from-[#1a1510] to-background">
        <div className="container text-center">
          <p className="text-gold text-xs font-medium tracking-[0.2em] uppercase mb-3">Legal</p>
          <h1 className="font-serif text-4xl lg:text-5xl font-bold mb-4">Privacy Policy</h1>
        </div>
      </section>
      <section className="py-12 lg:py-16">
        <div
          className="container max-w-3xl prose prose-invert prose-headings:font-serif prose-headings:text-foreground prose-p:text-muted-foreground prose-p:text-sm prose-p:leading-relaxed"
          dangerouslySetInnerHTML={{ __html: cleaned }}
        />
      </section>
    </Layout>
  );
}
