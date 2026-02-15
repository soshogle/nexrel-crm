import { useState } from "react";
import Layout from "@/components/Layout";
import ProductCard from "@/components/ProductCard";
import { trpc } from "@/lib/trpc";
import { Grid, List, SlidersHorizontal, ChevronDown, Loader2 } from "lucide-react";
import { Link } from "wouter";

const ITEMS_PER_PAGE = 24;

export default function Shop() {
  const [selectedCategory, setSelectedCategory] = useState("");
  const [sortBy, setSortBy] = useState("default");
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showFilters, setShowFilters] = useState(false);

  // Fetch products from database
  const productsQuery = trpc.products.list.useQuery({
    categorySlug: selectedCategory || undefined,
    page,
    limit: ITEMS_PER_PAGE,
    sortBy: sortBy !== "default" ? sortBy : undefined,
  });

  // Fetch categories from database
  const categoriesQuery = trpc.categories.list.useQuery();

  const products = productsQuery.data?.products || [];
  const totalCount = productsQuery.data?.total || 0;
  const categories = categoriesQuery.data || [];
  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  return (
    <Layout>
      {/* Hero banner */}
      <section className="relative py-16 lg:py-24 bg-gradient-to-b from-[#1a1510] to-background">
        <div className="container text-center">
          <p className="text-gold text-xs font-medium tracking-[0.2em] uppercase mb-3">Our Collection</p>
          <h1 className="font-serif text-4xl lg:text-5xl font-bold mb-4">Shop All Products</h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Browse our complete collection of hand forged medieval swords, armor, daggers, axes, and jewelry.
          </p>
        </div>
      </section>

      <section className="py-8 lg:py-12">
        <div className="container">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-8 pb-6 border-b border-border">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-gold transition-colors"
              >
                <SlidersHorizontal className="w-4 h-4" />
                Filters
              </button>
              <span className="text-sm text-muted-foreground">
                {productsQuery.isLoading ? "Loading..." : `Showing ${(page - 1) * ITEMS_PER_PAGE + 1}–${Math.min(page * ITEMS_PER_PAGE, totalCount)} of ${totalCount} results`}
              </span>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
                  className="appearance-none bg-secondary text-foreground text-sm px-4 py-2 pr-8 border border-border focus:border-gold outline-none"
                >
                  <option value="default">Default sorting</option>
                  <option value="price_asc">Price: Low to High</option>
                  <option value="price_desc">Price: High to Low</option>
                  <option value="name_asc">Name: A to Z</option>
                  <option value="name_desc">Name: Z to A</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-2 ${viewMode === "grid" ? "text-gold" : "text-muted-foreground"}`}
                >
                  <Grid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-2 ${viewMode === "list" ? "text-gold" : "text-muted-foreground"}`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="flex gap-8">
            {/* Sidebar filters */}
            <aside className={`${showFilters ? "block" : "hidden"} lg:block w-full lg:w-64 shrink-0`}>
              <div className="sticky top-24">
                <h3 className="font-serif text-lg font-semibold mb-4">Categories</h3>
                <div className="space-y-1 max-h-[70vh] overflow-y-auto pr-2">
                  <button
                    onClick={() => { setSelectedCategory(""); setPage(1); }}
                    className={`block w-full text-left text-sm py-1.5 px-2 transition-colors ${
                      !selectedCategory ? "text-gold font-medium" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    All Products
                  </button>
                  {categories.map((cat: any) => (
                    <button
                      key={cat.id}
                      onClick={() => { setSelectedCategory(cat.slug); setPage(1); }}
                      className={`block w-full text-left text-sm py-1.5 px-2 transition-colors ${
                        selectedCategory === cat.slug ? "text-gold font-medium" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {cat.name} ({cat.productCount || 0})
                    </button>
                  ))}
                </div>
              </div>
            </aside>

            {/* Product grid */}
            <div className="flex-1">
              {productsQuery.isLoading ? (
                <div className="flex justify-center py-24">
                  <Loader2 className="w-8 h-8 animate-spin text-gold" />
                </div>
              ) : products.length === 0 ? (
                <div className="text-center py-24">
                  <p className="text-muted-foreground">No products found in this category.</p>
                </div>
              ) : viewMode === "grid" ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 lg:gap-6">
                  {products.map((product: any) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              ) : (
                /* List view */
                <div className="space-y-4">
                  {products.map((product: any) => {
                    const category = product.categories?.[0] || "";
                    const hasVariations = (product.variationCount || 0) > 0;
                    const isOnSale = product.salePrice && product.salePrice !== product.price && parseFloat(product.salePrice) > 0;
                    const gallery = product.galleryImages || [];
                    const mainUrl = product.imageUrl || "";
                    const hoverImage = gallery.find((url: string) => url && url !== mainUrl) ?? (gallery.length > 1 ? gallery[1] : null);
                    return (
                      <ShopListCard
                        key={product.id}
                        product={product}
                        category={category}
                        hasVariations={hasVariations}
                        isOnSale={isOnSale}
                        hoverImage={hoverImage}
                      />
                    );
                  })}
                </div>
              )}
              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-2 mt-12">
                  <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                    className="px-4 py-2 text-sm border border-border text-muted-foreground hover:border-gold hover:text-gold transition-colors disabled:opacity-30"
                  >
                    Previous
                  </button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) pageNum = i + 1;
                    else if (page <= 3) pageNum = i + 1;
                    else if (page >= totalPages - 2) pageNum = totalPages - 4 + i;
                    else pageNum = page - 2 + i;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        className={`w-10 h-10 text-sm border transition-colors ${
                          page === pageNum
                            ? "border-gold bg-gold text-[#0D0D0D] font-semibold"
                            : "border-border text-muted-foreground hover:border-gold hover:text-gold"
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                    disabled={page === totalPages}
                    className="px-4 py-2 text-sm border border-border text-muted-foreground hover:border-gold hover:text-gold transition-colors disabled:opacity-30"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}

function ShopListCard({ product, category, hasVariations, isOnSale, hoverImage }: { product: any; category: string; hasVariations: boolean; isOnSale: boolean; hoverImage: string | null }) {
  const [isHovered, setIsHovered] = useState(false);
  return (
    <Link
      href={`/product/${product.slug}`}
      className="group flex gap-6 p-4 bg-card border border-border hover:border-gold/30 transition-colors"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="relative w-32 h-32 bg-[#f5f0eb] overflow-hidden shrink-0">
        {product.imageUrl ? (
          <>
            <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover transition-transform duration-500" style={{ transform: isHovered ? "scale(1.1)" : "scale(1)" }} loading="lazy" />
            {hoverImage && (
              <img src={hoverImage} alt="" className="absolute inset-0 w-full h-full object-cover transition-all duration-500" style={{ opacity: isHovered ? 1 : 0, transform: isHovered ? "scale(1.1)" : "scale(1)" }} loading="lazy" />
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-[#1a1510]">
            <span className="text-gold/30 text-xs text-center px-2 font-serif">{product.name}</span>
          </div>
        )}
      </div>
                        <div className="flex-1">
                          {category && (
                            <p className="text-[10px] font-medium tracking-[0.15em] uppercase text-muted-foreground mb-1">
                              {category}
                            </p>
                          )}
                          <h3 className="text-sm font-medium text-foreground group-hover:text-gold transition-colors line-clamp-2">
                            {product.name}
                          </h3>
                          <div className="flex items-center gap-2 mt-1.5">
                            {hasVariations && product.minVariationPrice && product.maxVariationPrice ? (
                              <span className="text-sm font-semibold text-foreground">
                                USD${parseFloat(product.minVariationPrice).toFixed(2)} &ndash; USD${parseFloat(product.maxVariationPrice).toFixed(2)}
                              </span>
                            ) : isOnSale ? (
                              <>
                                <span className="text-sm font-semibold text-[#8B0000]">USD${parseFloat(product.salePrice).toFixed(2)}</span>
                                <span className="text-xs text-muted-foreground line-through">USD${parseFloat(product.price).toFixed(2)}</span>
                              </>
                            ) : product.price && parseFloat(product.price) > 0 ? (
                              <span className="text-sm font-semibold text-foreground">USD${parseFloat(product.price).toFixed(2)}</span>
                            ) : (
                              <span className="text-sm text-muted-foreground italic">Contact for price</span>
                            )}
                          </div>
                          {product.shortDescription && (
                            <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{product.shortDescription}</p>
                          )}
                          <div className="mt-2">
                            <span className="text-xs font-semibold tracking-wider uppercase text-gold">
                              {hasVariations ? "Select Options" : "Add to Cart"}
                            </span>
                          </div>
                        </div>
    </Link>
  );
}
