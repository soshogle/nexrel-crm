import { useState, useMemo, useEffect } from "react";
import { Link, useParams } from "wouter";
import Layout from "@/components/Layout";
import ProductOptionsWizard from "@/components/ProductOptionsWizard";
import { trpc } from "@/lib/trpc";
import { useCart } from "@/contexts/CartContext";
import { ChevronRight, Minus, Plus, ShoppingCart, Heart, Share2, Loader2 } from "lucide-react";
import MotionImage from "@/components/MotionImage";
import { toast } from "sonner";

export default function ProductPage() {
  const { slug } = useParams<{ slug: string }>();
  const [selectedImage, setSelectedImage] = useState(0);
  const [qty, setQty] = useState(1);
  const [activeTab, setActiveTab] = useState("description");
  const [selectedVariations, setSelectedVariations] = useState<Record<string, string>>({});
  const [selectedAttributes, setSelectedAttributes] = useState<Record<string, string>>({});
  const { addItem, setIsOpen } = useCart();

  // Fetch product from database
  const productQuery = trpc.products.getBySlug.useQuery(
    { slug: slug || "" },
    { enabled: !!slug }
  );

  // Fetch variations
  const variationsQuery = trpc.products.getVariations.useQuery(
    { productId: productQuery.data?.id || 0 },
    { enabled: !!productQuery.data?.id }
  );

  // Fetch product attributes (grip, scabbard, blade finish, guard & pommel finish)
  const attributesQuery = trpc.products.getAttributes.useQuery(
    { productId: productQuery.data?.id || 0 },
    { enabled: !!productQuery.data?.id }
  );

  // Fetch related products
  const firstCategory = productQuery.data?.categories ? String(productQuery.data.categories).split(',')[0]?.trim() || '' : '';
  const relatedQuery = trpc.products.getRelated.useQuery(
    { productId: productQuery.data?.id || 0, categoryName: firstCategory, limit: 4 },
    { enabled: !!productQuery.data?.id }
  );

  const product = productQuery.data;
  const variations = variationsQuery.data || [];
  const attributes = attributesQuery.data || [];
  const relatedProducts = relatedQuery.data || [];

  // SEO: Set document title and meta description from Yoast meta
  useEffect(() => {
    if (!product) return;
    const title = product.metaTitle || product.name;
    const desc = product.metaDescription || product.shortDescription || product.description?.replace(/<[^>]+>/g, "").slice(0, 160) || "";
    document.title = title;
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement("meta");
      metaDesc.setAttribute("name", "description");
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute("content", desc.slice(0, 160));
    return () => {
      document.title = "Medieval Swords, Daggers and Armors Hand Forged and Battle Ready";
      if (metaDesc) metaDesc.setAttribute("content", "Darksword Armory's Battle Ready Medieval swords, daggers and medieval weapons are individually hand forged in Canada to look, feel and handle as the originals.");
    };
  }, [product?.id, product?.metaTitle, product?.metaDescription, product?.name, product?.shortDescription, product?.description]);

  // Set default attribute values when attributes load (including auto-select for single-option attributes)
  useEffect(() => {
    if (attributes.length === 0) return;
    setSelectedAttributes((prev) => {
      const next = { ...prev };
      for (const attr of attributes) {
        const opts = attr.options as Array<{ value: string; isDefault?: boolean }>;
        const defaultOpt = opts.find((o) => o.isDefault);
        if (defaultOpt && !next[attr.attributeKey]) {
          next[attr.attributeKey] = defaultOpt.value;
        }
        // Auto-select single-option attributes so Add to Cart is enabled without extra clicks
        if (opts.length === 1 && !next[attr.attributeKey]) {
          next[attr.attributeKey] = opts[0].value;
        }
      }
      return next;
    });
  }, [attributes]);

  // Group variations by type
  const variationGroups = useMemo(() => {
    const groups: Record<string, Array<{ id: number; name: string; price: string | null; regularPrice: string | null; salePrice: string | null; priceModifier: string | null; stockStatus: string | null }>> = {};
    variations.forEach((v: any) => {
      const type = v.variationType || v.optionName || "Option";
      if (!groups[type]) groups[type] = [];
      groups[type].push({
        id: v.id,
        name: v.name || v.optionValue,
        price: v.price,
        regularPrice: v.regularPrice,
        salePrice: v.salePrice,
        priceModifier: v.priceModifier,
        stockStatus: v.stockStatus,
      });
    });
    return groups;
  }, [variations]);

  // Calculate price based on selected variation (absolute price) or base product price
  const calculatedPrice = useMemo(() => {
    if (!product?.price) return null;
    const basePrice = parseFloat(product.salePrice || product.price);
    
    // If a variation is selected, use its absolute price
    for (const [type, varName] of Object.entries(selectedVariations)) {
      const group = variationGroups[type];
      if (group) {
        const selected = group.find(v => v.name === varName);
        if (selected) {
          if (selected.salePrice && parseFloat(selected.salePrice) > 0) {
            return parseFloat(selected.salePrice);
          }
          if (selected.price && parseFloat(selected.price) > 0) {
            return parseFloat(selected.price);
          }
          if (selected.priceModifier && parseFloat(selected.priceModifier) !== 0) {
            return basePrice + parseFloat(selected.priceModifier);
          }
        }
      }
    }
    return basePrice;
  }, [product, selectedVariations, variationGroups]);

  if (productQuery.isLoading) {
    return (
      <Layout>
        <div className="container py-24 text-center">
          <Loader2 className="w-12 h-12 animate-spin text-[#C9A84C] mx-auto mb-4" />
          <p className="text-[#FAF3E0]/60">Loading product...</p>
        </div>
      </Layout>
    );
  }

  if (!product) {
    return (
      <Layout>
        <div className="container py-24 text-center">
          <h1 className="font-serif text-3xl font-bold mb-4">Product Not Found</h1>
          <p className="text-muted-foreground mb-8">The product you're looking for doesn't exist.</p>
          <Link href="/shop" className="inline-flex items-center px-6 py-3 bg-gold text-[#0D0D0D] text-sm font-semibold tracking-wider uppercase">Browse All Products</Link>
        </div>
      </Layout>
    );
  }

  const galleryImages: string[] = product.galleryImages ? (product.galleryImages as unknown as string[]) : [];
  const allImages = [product.imageUrl, ...galleryImages].filter(Boolean) as string[];
  const currentImage = allImages[selectedImage] || product.imageUrl || "";
  const displayPrice = calculatedPrice ?? (product.salePrice ? parseFloat(product.salePrice) : product.price ? parseFloat(product.price) : null);
  const originalPrice = product.salePrice && product.salePrice !== product.price ? product.price : null;
  const categories = product.categories ? String(product.categories).split(",").map((c: string) => c.trim()) : [];

  const handleAddToCart = async () => {
    // Check if all required variations are selected
    const requiredTypes = Object.keys(variationGroups);
    const missingTypes = requiredTypes.filter(t => !selectedVariations[t]);
    
    // Check if all required attributes are selected (only those with multiple options)
    const requiredAttrs = attributes.filter((a: any) => {
      const opts = a.options as Array<{ value: string; colorHex?: string; isDefault?: boolean }>;
      return opts.length > 1;
    });
    const missingAttrs = requiredAttrs.filter((a: any) => !selectedAttributes[a.attributeKey]);
    
    if (missingTypes.length > 0 || missingAttrs.length > 0) {
      const allMissing = [
        ...missingTypes,
        ...missingAttrs.map((a: any) => a.attributeName),
      ];
      toast.error(`Please select: ${allMissing.join(", ")}`);
      return;
    }

    try {
      // Find the selected variation ID (prefer Package type for price lookup; otherwise first match)
      let variationId: number | undefined;
      const priceTypes = ["Package", "package", "Size", "size", "Option", "option"];
      for (const type of priceTypes) {
        const name = selectedVariations[type];
        if (name) {
          const group = variationGroups[type];
          if (group) {
            const found = group.find(v => (v.name || "").trim() === (name || "").trim());
            if (found) {
              variationId = found.id;
              break;
            }
          }
        }
      }
      if (!variationId && Object.keys(selectedVariations).length > 0) {
        const [type, name] = Object.entries(selectedVariations)[0];
        const group = variationGroups[type];
        if (group) {
          const found = group.find(v => (v.name || "").trim() === (name || "").trim());
          if (found) variationId = found.id;
        }
      }

      // Merge variation selections with attribute selections for cart details
      const allDetails = { ...selectedVariations, ...selectedAttributes };
      await addItem(product.id, qty, variationId, allDetails);
      toast.success(`${product.name} added to cart`);
      setIsOpen(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to add to cart";
      toast.error(msg.includes("Product not found") ? "Product not found" : "Failed to add to cart");
    }
  };

  return (
    <Layout>
      {/* Breadcrumb */}
      <div className="container py-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
          <Link href="/" className="hover:text-gold transition-colors">Home</Link>
          <ChevronRight className="w-3 h-3" />
          <Link href="/shop" className="hover:text-gold transition-colors">Shop</Link>
          {categories[0] && (
            <>
              <ChevronRight className="w-3 h-3" />
              <Link href={`/category/${categories[0].toLowerCase().replace(/[^a-z0-9]+/g, '-')}`} className="hover:text-gold transition-colors">{categories[0]}</Link>
            </>
          )}
          <ChevronRight className="w-3 h-3" />
          <span className="text-foreground">{product.name}</span>
        </div>
      </div>

      {/* Product detail */}
      <section className="container pb-16">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-16">
          {/* Image gallery */}
          <div>
            <div className="aspect-square bg-[#111] overflow-hidden mb-4">
              <MotionImage
                src={currentImage}
                alt={product.name}
                index={selectedImage}
                duration={10}
                className="w-full h-full aspect-square"
                fallback={
                  <span className="text-[#C9A84C]/30 text-lg text-center px-8 font-serif">{product.name}</span>
                }
              />
            </div>
            {allImages.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {allImages.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedImage(i)}
                    className={`w-20 h-20 shrink-0 overflow-hidden border-2 transition-colors ${selectedImage === i ? "border-gold" : "border-border hover:border-gold/50"}`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product info */}
          <div>
            {categories[0] && (
              <p className="text-gold text-xs font-medium tracking-[0.2em] uppercase mb-2">{categories[0]}</p>
            )}
            <h1 className="font-serif text-3xl lg:text-4xl font-bold mb-4">{product.name}</h1>

            {product.sku && (
              <p className="text-xs text-muted-foreground mb-4">SKU: {product.sku}</p>
            )}

            {/* Short description */}
            {product.shortDescription && (
              <div className="text-sm text-muted-foreground leading-relaxed mb-6 [&_p]:mb-2 [&_span]:!font-sans [&_span]:!text-sm [&_img]:max-w-full [&_img]:h-auto [&_img]:max-h-[300px] [&_img]:object-contain [&_img]:rounded"
                dangerouslySetInnerHTML={{ __html: product.shortDescription }}
              />
            )}

            {/* Price */}
            <div className="flex items-baseline gap-3 mb-6">
              {displayPrice ? (
                <>
                  <span className="text-3xl font-serif font-bold text-gold">USD${displayPrice.toFixed(2)}</span>
                  {originalPrice && (
                    <span className="text-lg text-muted-foreground line-through">USD${parseFloat(originalPrice).toFixed(2)}</span>
                  )}
                  {originalPrice && displayPrice < parseFloat(originalPrice) && (
                    <span className="text-xs font-semibold text-crimson bg-crimson/10 px-2 py-1">
                      SAVE ${(parseFloat(originalPrice) - displayPrice).toFixed(2)}
                    </span>
                  )}
                </>
              ) : (
                <span className="text-xl text-muted-foreground">Contact for pricing</span>
              )}
            </div>

            {/* === STEP-BY-STEP OPTIONS WIZARD (always shown; step 1 for simple products, ready for future attributes) === */}
            <div className="mb-6">
              <ProductOptionsWizard
                variationGroups={variationGroups}
                attributes={attributes}
                selectedVariations={selectedVariations}
                setSelectedVariations={setSelectedVariations}
                selectedAttributes={selectedAttributes}
                setSelectedAttributes={setSelectedAttributes}
                onAddToCart={handleAddToCart}
                displayPrice={displayPrice}
                isOutOfStock={product.stockStatus === "outofstock"}
                qty={qty}
                onQtyChange={setQty}
              />
              <Link
                href="/cart"
                className="mt-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-gold transition-colors"
              >
                View Cart
              </Link>
            </div>

            <div className="flex gap-4 mb-8">
              <button onClick={() => toast.success("Added to wishlist")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-gold transition-colors">
                <Heart className="w-4 h-4" /> Add to Wishlist
              </button>
              <button onClick={() => { navigator.clipboard.writeText(window.location.href); toast.success("Link copied"); }} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-gold transition-colors">
                <Share2 className="w-4 h-4" /> Share
              </button>
            </div>

            {/* SKU & Categories */}
            {product.sku && (
              <p className="text-xs text-muted-foreground mb-1">SKU: {product.sku}</p>
            )}
            {categories.length > 0 && (
              <div className="text-xs text-muted-foreground">
                <span>Categories: </span>
                {categories.map((cat: string, i: number) => (
                  <span key={cat}>
                    <Link href={`/category/${cat.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`} className="hover:text-gold transition-colors">{cat}</Link>
                    {i < categories.length - 1 && ", "}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-16">
          <div className="flex gap-0 border-b border-border">
            {["description", "specifications", "shipping"].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-3 text-sm font-medium tracking-wider uppercase transition-colors border-b-2 -mb-[1px] ${
                  activeTab === tab ? "border-gold text-gold" : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
          <div className="py-8">
            {activeTab === "description" && (
              <div
                className="prose prose-invert max-w-none text-sm text-muted-foreground leading-relaxed [&_img]:max-w-full [&_img]:h-auto [&_img]:max-h-[400px] [&_img]:object-contain [&_img]:rounded"
                dangerouslySetInnerHTML={{ __html: product.description || "No description available for this product." }}
              />
            )}
            {activeTab === "specifications" && (
              <div className="grid md:grid-cols-2 gap-4 max-w-2xl">
                <div className="flex justify-between py-3 border-b border-border">
                  <span className="text-sm text-muted-foreground">Steel</span>
                  <span className="text-sm font-medium">5160 High Carbon</span>
                </div>
                {product.weight && (
                  <div className="flex justify-between py-3 border-b border-border">
                    <span className="text-sm text-muted-foreground">Weight</span>
                    <span className="text-sm font-medium">{product.weight}</span>
                  </div>
                )}
                <div className="flex justify-between py-3 border-b border-border">
                  <span className="text-sm text-muted-foreground">Hardness</span>
                  <span className="text-sm font-medium">50-53 HRC</span>
                </div>
                <div className="flex justify-between py-3 border-b border-border">
                  <span className="text-sm text-muted-foreground">Heat Treatment</span>
                  <span className="text-sm font-medium">Oil Quenched & Tempered</span>
                </div>
                {product.sku && (
                  <div className="flex justify-between py-3 border-b border-border">
                    <span className="text-sm text-muted-foreground">SKU</span>
                    <span className="text-sm font-medium">{product.sku}</span>
                  </div>
                )}
              </div>
            )}
            {activeTab === "shipping" && (
              <div className="text-sm text-muted-foreground leading-relaxed max-w-2xl space-y-4">
                <p>Free shipping on all orders over $500. Orders under $500 are subject to standard shipping rates based on destination.</p>
                <p>All swords are carefully packaged in custom boxes to ensure safe delivery. Most orders ship within 2-4 weeks as each sword is individually hand forged.</p>
                <p>We ship worldwide. International customers may be responsible for import duties and taxes upon delivery.</p>
              </div>
            )}
          </div>
        </div>

        {/* Related products */}
        {relatedProducts.length > 0 && (
          <div className="mt-16">
            <h2 className="font-serif text-2xl font-semibold mb-8">You may also like</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 lg:gap-6">
              {relatedProducts.map((rp: any) => {
                const rpPrice = rp.price ? parseFloat(rp.price) : 0;
                const hasImage = rp.imageUrl && rp.imageUrl.trim() !== '';
                return (
                  <Link key={rp.id} href={`/product/${rp.slug}`} className="group block">
                    <div className="aspect-square bg-[#111] overflow-hidden mb-3">
                      {hasImage ? (
                        <img src={rp.imageUrl} alt={rp.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).parentElement!.classList.add('flex', 'items-center', 'justify-center'); const span = document.createElement('span'); span.className = 'text-[#C9A84C]/40 text-xs text-center px-2'; span.textContent = rp.name; (e.target as HTMLImageElement).parentElement!.appendChild(span); }} />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="text-[#C9A84C]/40 text-xs text-center px-2">{rp.name}</span>
                        </div>
                      )}
                    </div>
                    <h3 className="text-sm font-medium group-hover:text-gold transition-colors line-clamp-2">{rp.name}</h3>
                    {rpPrice > 0 ? (
                      <p className="text-sm font-semibold text-gold mt-1">USD${rpPrice.toFixed(2)}</p>
                    ) : (
                      <p className="text-sm text-muted-foreground mt-1">Contact for pricing</p>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </section>
    </Layout>
  );
}
