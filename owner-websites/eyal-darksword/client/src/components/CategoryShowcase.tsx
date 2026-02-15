import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Loader2 } from "lucide-react";

const SHOWCASE_CATEGORIES = [
  { slug: "medieval-swords", name: "Medieval Swords", fallbackCount: "94 swords" },
  { slug: "viking-swords", name: "Viking Swords", fallbackCount: "16 swords" },
  { slug: "fantasy-swords", name: "Fantasy Swords", fallbackCount: "31 swords" },
  { slug: "medieval-armor", name: "Medieval Armor", fallbackCount: "33 pieces" },
  { slug: "medieval-daggers", name: "Medieval Daggers", fallbackCount: "24 daggers" },
  { slug: "medieval-jewelry", name: "Medieval Jewelry", fallbackCount: "42 pieces" },
];

export default function CategoryShowcase() {
  const categoriesQuery = trpc.categories.list.useQuery();
  const categories = categoriesQuery.data || [];

  // Match showcase categories with DB data for counts and images
  const showcaseData = SHOWCASE_CATEGORIES.map((sc) => {
    const dbCat = categories.find(
      (c: any) => c.slug === sc.slug || c.name === sc.name
    );
    return {
      ...sc,
      count: dbCat?.productCount ? `${dbCat.productCount} products` : sc.fallbackCount,
      href: `/shop?category=${sc.slug}`,
    };
  });

  // Fetch a representative product image for each category
  return (
    <section className="py-16 lg:py-24">
      <div className="container">
        <p className="text-gold text-xs font-medium tracking-[0.2em] uppercase text-center mb-2">
          Browse by Category
        </p>
        <h2 className="font-serif text-3xl lg:text-4xl font-semibold text-center mb-4">
          Explore our collections.
        </h2>
        <p className="text-center text-muted-foreground mb-12 max-w-xl mx-auto">
          From Viking longships to Gothic cathedrals — weapons and armor spanning centuries of history.
        </p>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
          {showcaseData.map((cat) => (
            <CategoryCard key={cat.slug} cat={cat} />
          ))}
        </div>
      </div>
    </section>
  );
}

function CategoryCard({
  cat,
}: {
  cat: { slug: string; name: string; count: string; href: string };
}) {
  // Fetch one product from this category to use as the card image
  const productsQuery = trpc.products.list.useQuery({
    categorySlug: cat.slug,
    limit: 1,
    page: 1,
  });
  const product = productsQuery.data?.products?.[0];
  const imageUrl = product?.imageUrl;

  return (
    <Link
      href={cat.href}
      className="group relative aspect-[4/5] overflow-hidden bg-[#1a1510] block"
    >
      {/* Product image as category background */}
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={cat.name}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          loading="lazy"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          {productsQuery.isLoading ? (
            <Loader2 className="w-6 h-6 animate-spin text-gold/30" />
          ) : (
            <span className="text-gold/30 font-serif text-lg">{cat.name}</span>
          )}
        </div>
      )}

      {/* Bottom gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

      {/* Bottom text */}
      <div className="absolute bottom-0 left-0 right-0 p-5 lg:p-6">
        <p className="text-[10px] font-medium tracking-[0.15em] uppercase text-gold mb-1">
          {cat.count}
        </p>
        <h3 className="font-serif text-lg lg:text-xl font-semibold text-white group-hover:text-gold transition-colors">
          {cat.name}
        </h3>
        <span className="inline-block mt-2 text-xs font-medium tracking-wider uppercase text-white/60 group-hover:text-gold transition-colors">
          Shop now &rarr;
        </span>
      </div>
    </Link>
  );
}
