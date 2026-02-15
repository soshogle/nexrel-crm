import { useRef } from "react";
import { Link } from "wouter";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import ProductCard from "@/components/ProductCard";

export default function ProductCarousel() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { data: products, isLoading } = trpc.products.getFeatured.useQuery({ limit: 20 });

  const scroll = (dir: "left" | "right") => {
    if (!scrollRef.current) return;
    const amount = 320;
    scrollRef.current.scrollBy({ left: dir === "left" ? -amount : amount, behavior: "smooth" });
  };

  return (
    <section className="py-16 lg:py-24">
      <div className="container">
        <div className="flex items-end justify-between mb-10">
          <div>
            <p className="text-gold text-xs font-medium tracking-[0.2em] uppercase mb-2">Our Collection</p>
            <h2 className="font-serif text-3xl lg:text-4xl font-semibold text-foreground">Shop our best sellers.</h2>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/shop"
              className="hidden sm:inline-flex text-sm text-gold font-medium tracking-wider uppercase hover:text-gold-light transition-colors"
            >
              Shop all
            </Link>
            <div className="flex gap-2">
              <button onClick={() => scroll("left")} className="p-2.5 border border-border hover:border-gold hover:text-gold transition-colors" aria-label="Previous">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button onClick={() => scroll("right")} className="p-2.5 border border-border hover:border-gold hover:text-gold transition-colors" aria-label="Next">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-gold" />
          </div>
        ) : (
          <div
            ref={scrollRef}
            className="flex gap-5 overflow-x-auto scrollbar-hide pb-4 -mx-1 px-1 snap-x snap-mandatory"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {(products || []).map((product: any) => (
              <div key={product.id} className="flex-shrink-0 w-[280px] sm:w-[300px] snap-start">
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
