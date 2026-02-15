import { useState } from "react";
import { Link } from "wouter";
import { ShoppingCart } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";

interface ProductCardProps {
  product: {
    id: number;
    name: string;
    slug: string;
    price: string;
    salePrice?: string | null;
    imageUrl?: string | null;
    galleryImages?: string[] | null;
    categories?: string[] | null;
    stockStatus?: string;
    variationCount?: number;
    minVariationPrice?: string | null;
    maxVariationPrice?: string | null;
  };
  className?: string;
}

export default function ProductCard({ product, className = "" }: ProductCardProps) {
  const [imgError, setImgError] = useState(false);
  const [hoverImgError, setHoverImgError] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const { addItem, setIsOpen } = useCart();
  const [adding, setAdding] = useState(false);

  const isOnSale =
    product.salePrice &&
    product.salePrice !== product.price &&
    parseFloat(product.salePrice) > 0;
  const isOutOfStock = product.stockStatus === "outofstock";
  const hasVariations = (product.variationCount || 0) > 0;
  const category =
    product.categories && product.categories.length > 0
      ? product.categories[0]
      : "";

  // Get the first gallery image that differs from main (Flatsome back-image hover reveal)
  const gallery = product.galleryImages || [];
  const mainUrl = product.imageUrl || "";
  const hoverImage = gallery.find((url) => url && url !== mainUrl) ?? (gallery.length > 1 ? gallery[1] : null);

  // Price display logic
  const priceDisplay = () => {
    if (hasVariations && product.minVariationPrice && product.maxVariationPrice) {
      const min = parseFloat(product.minVariationPrice);
      const max = parseFloat(product.maxVariationPrice);
      if (min !== max) {
        return (
          <span className="text-sm font-semibold text-foreground">
            USD${min.toFixed(2)} &ndash; USD${max.toFixed(2)}
          </span>
        );
      }
      return (
        <span className="text-sm font-semibold text-foreground">
          USD${min.toFixed(2)}
        </span>
      );
    }
    if (isOnSale) {
      return (
        <>
          <span className="text-sm font-semibold text-[#8B0000]">
            USD${parseFloat(product.salePrice!).toFixed(2)}
          </span>
          <span className="text-xs text-muted-foreground line-through ml-1">
            USD${parseFloat(product.price).toFixed(2)}
          </span>
        </>
      );
    }
    if (product.price && parseFloat(product.price) > 0) {
      return (
        <span className="text-sm font-semibold text-foreground">
          USD${parseFloat(product.price).toFixed(2)}
        </span>
      );
    }
    return <span className="text-sm text-muted-foreground italic">Contact for price</span>;
  };

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (hasVariations || isOutOfStock) return;
    setAdding(true);
    try {
      await addItem(product.id, 1);
      setIsOpen(true);
      toast.success(`${product.name} added to cart`);
    } catch {
      toast.error("Failed to add to cart");
    } finally {
      setAdding(false);
    }
  };

  return (
    <div
      className={`product-card ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Link href={`/product/${product.slug}`} className="block">
        {/* Image container — Flatsome-style hover swap */}
        <div className="relative aspect-square bg-[#f5f0eb] overflow-hidden">
          {/* Primary image */}
          {product.imageUrl && !imgError ? (
            <img
              src={product.imageUrl}
              alt={product.name}
              className="w-full h-full object-cover transition-transform duration-500"
              style={{
                transform: isHovered ? "scale(1.1)" : "scale(1)",
              }}
              loading="lazy"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-[#1a1510]">
              <span className="text-gold/30 text-xs text-center px-4 font-serif">
                {product.name}
              </span>
            </div>
          )}

          {/* Secondary image — fades in on hover (Flatsome back-image behavior) */}
          {hoverImage && !hoverImgError && (
            <img
              src={hoverImage}
              alt={`${product.name} - alternate view`}
              className="absolute inset-0 w-full h-full object-cover transition-all duration-500"
              style={{
                opacity: isHovered ? 1 : 0,
                transform: isHovered ? "scale(1.1)" : "scale(1)",
              }}
              loading="lazy"
              onError={() => setHoverImgError(true)}
            />
          )}

          {/* Sale badge */}
          {isOnSale && (
            <span className="absolute top-2 left-2 px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase bg-[#8B0000] text-white z-10">
              Sale
            </span>
          )}

          {/* Out of stock overlay */}
          {isOutOfStock && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-10">
              <span className="bg-black/70 text-white text-xs font-bold tracking-wider uppercase px-4 py-2">
                Out of Stock
              </span>
            </div>
          )}
        </div>

        {/* Product info below image — matches original site layout */}
        <div className="pt-3 pb-2">
          {category && (
            <p className="text-[10px] font-medium tracking-[0.15em] uppercase text-muted-foreground mb-1">
              {category}
            </p>
          )}
          <h3
            className="text-sm font-medium transition-colors leading-snug line-clamp-2 mb-1.5"
            style={{
              color: isHovered ? "var(--color-gold)" : "var(--foreground)",
            }}
          >
            {product.name}
          </h3>
          <div className="flex items-center flex-wrap gap-x-1">{priceDisplay()}</div>
        </div>
      </Link>

      {/* Action button — below price, matches original site */}
      <div className="mt-1">
        {isOutOfStock ? (
          <Link
            href={`/product/${product.slug}`}
            className="inline-block text-xs font-semibold tracking-wider uppercase border border-border text-muted-foreground px-4 py-2 hover:border-gold hover:text-gold transition-colors"
          >
            Read More
          </Link>
        ) : hasVariations ? (
          <Link
            href={`/product/${product.slug}`}
            className="inline-block text-xs font-semibold tracking-wider uppercase border border-border text-foreground px-4 py-2 hover:border-gold hover:text-gold transition-colors"
          >
            Select Options
          </Link>
        ) : (
          <button
            onClick={handleAddToCart}
            disabled={adding}
            className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-wider uppercase border border-border text-foreground px-4 py-2 hover:border-gold hover:text-gold transition-colors disabled:opacity-50"
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            {adding ? "Adding..." : "Add to Cart"}
          </button>
        )}
      </div>
    </div>
  );
}
