import { useParams } from "wouter";
import Layout from "@/components/Layout";
import { getPageBySlug } from "@/data/pages";
import { useEcommerceContent } from "@/contexts/EcommerceContentContext";

export default function GenericPage() {
  const { slug } = useParams<{ slug: string }>();
  const ecommerce = useEcommerceContent();
  const page = ecommerce?.getPageBySlug?.(slug || "") ?? getPageBySlug(slug || "");

  return (
    <Layout>
      <section className="relative py-16 lg:py-24 bg-gradient-to-b from-[#1a1510] to-background">
        <div className="container text-center">
          <h1 className="font-serif text-4xl lg:text-5xl font-bold mb-4">{page?.title || "Page"}</h1>
        </div>
      </section>
      <section className="py-12 lg:py-16">
        <div className="container max-w-3xl">
          {page?.content ? (
            <div className="prose prose-invert max-w-none text-sm text-muted-foreground leading-relaxed">
              {page.content.split('\n').filter(Boolean).map((para, i) => (
                <p key={i} className="mb-4">{para}</p>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center">This page is currently being updated.</p>
          )}
        </div>
      </section>
    </Layout>
  );
}
