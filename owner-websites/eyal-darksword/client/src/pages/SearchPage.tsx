import { useState, useMemo } from "react";
import { Link, useSearch } from "wouter";
import Layout from "@/components/Layout";
import { products } from "@/data/products";
import { Search } from "lucide-react";

export default function SearchPage() {
  const searchParams = useSearch();
  const urlQuery = new URLSearchParams(searchParams).get("q") || "";
  const [query, setQuery] = useState(urlQuery);

  const results = useMemo(() => {
    if (!query || query.length < 2) return [];
    const q = query.toLowerCase();
    return products.filter(p =>
      p.image && (
        p.title.toLowerCase().includes(q) ||
        p.categories.some(c => c.toLowerCase().includes(q)) ||
        p.description.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q)
      )
    );
  }, [query]);

  return (
    <Layout>
      <section className="relative py-16 lg:py-24 bg-gradient-to-b from-[#1a1510] to-background">
        <div className="container text-center">
          <h1 className="font-serif text-4xl lg:text-5xl font-bold mb-6">Search</h1>
          <div className="max-w-xl mx-auto relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search swords, armor, daggers..."
              className="w-full pl-12 pr-4 py-4 bg-secondary border border-border text-foreground text-base placeholder:text-muted-foreground focus:border-gold outline-none transition-colors"
              autoFocus
            />
          </div>
          {query.length >= 2 && (
            <p className="text-muted-foreground mt-4">{results.length} results for "{query}"</p>
          )}
        </div>
      </section>

      <section className="py-12 lg:py-16">
        <div className="container">
          {results.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6">
              {results.map(product => (
                <Link key={product.id} href={`/product/${product.slug}`} className="group block">
                  <div className="aspect-square bg-[#111] overflow-hidden mb-3">
                    <img src={product.image} alt={product.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy"
                      onError={(e) => { (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1528938102132-4a9276b8e320?w=400&h=400&fit=crop"; }} />
                  </div>
                  {product.categories[0] && (
                    <p className="text-[10px] font-medium tracking-[0.15em] uppercase text-gold mb-1">{product.categories[0]}</p>
                  )}
                  <h3 className="text-sm font-medium group-hover:text-gold transition-colors line-clamp-2">{product.title}</h3>
                  {product.price && (
                    <p className="text-sm font-semibold text-gold mt-1">USD${parseFloat(product.price).toFixed(2)}</p>
                  )}
                </Link>
              ))}
            </div>
          ) : query.length >= 2 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">No products found matching your search.</p>
              <Link href="/shop" className="text-gold hover:underline text-sm">Browse all products</Link>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Enter at least 2 characters to search.</p>
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
}
