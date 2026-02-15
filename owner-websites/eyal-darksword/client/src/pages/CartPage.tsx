import Layout from "@/components/Layout";
import { Link } from "wouter";
import { useCart } from "@/contexts/CartContext";
import { trpc } from "@/lib/trpc";
import { ShoppingCart, Minus, Plus, Trash2 } from "lucide-react";
import { useMemo } from "react";

export default function CartPage() {
  const { items, count, total, updateQuantity, removeItem } = useCart();

  // Fetch "Frequently bought together" recommendations (related products, excluding cart items)
  const cartProductIds = useMemo(() => items.map((i) => i.productId), [items]);
  const recommendationsQuery = trpc.cart.getRecommendations.useQuery(
    { productIds: cartProductIds, limit: 3 },
    { enabled: cartProductIds.length > 0 }
  );
  const recommendations = recommendationsQuery.data || [];

  if (items.length === 0) {
    return (
      <Layout>
        <section className="relative py-16 lg:py-24 bg-gradient-to-b from-[#1a1510] to-background">
          <div className="container text-center">
            <h1 className="font-serif text-4xl lg:text-5xl font-bold mb-4">Shopping Cart</h1>
          </div>
        </section>
        <section className="py-12 lg:py-16">
          <div className="container max-w-3xl text-center">
            <ShoppingCart className="w-16 h-16 text-muted-foreground mx-auto mb-6" />
            <h2 className="font-serif text-2xl font-semibold mb-3">Your cart is empty</h2>
            <p className="text-muted-foreground mb-8">Looks like you haven&apos;t added any items to your cart yet.</p>
            <Link href="/shop" className="inline-flex items-center px-8 py-3.5 bg-gold text-[#0D0D0D] text-sm font-semibold tracking-[0.1em] uppercase hover:bg-gold-light transition-colors">
              Continue Shopping
            </Link>
          </div>
        </section>
      </Layout>
    );
  }

  return (
    <Layout>
      <section className="relative py-12 lg:py-16 bg-gradient-to-b from-[#1a1510] to-background">
        <div className="container">
          <h1 className="font-serif text-4xl lg:text-5xl font-bold mb-2">Shopping Cart</h1>
          <p className="text-muted-foreground">{count} {count === 1 ? "item" : "items"}</p>
        </div>
      </section>

      <section className="py-12 lg:py-16">
        <div className="container max-w-5xl">
          <div className="grid lg:grid-cols-3 gap-12">
            {/* Cart items */}
            <div className="lg:col-span-2 space-y-6">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex gap-4 bg-[#1A1A1A] rounded-lg p-4 border border-[#C9A84C]/10"
                >
                  <div className="w-24 h-24 flex-shrink-0 rounded overflow-hidden bg-[#2A2A2A]">
                    {item.product?.imageUrl ? (
                      <img
                        src={item.product.imageUrl}
                        alt={item.product?.name || ""}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[#C9A84C]/30">
                        <ShoppingCart className="w-10 h-10" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/product/${item.product?.slug || ""}`}
                      className="text-[#FAF3E0] font-medium hover:text-gold transition-colors line-clamp-2"
                    >
                      {item.product?.name || "Product"}
                    </Link>
                    {item.variationDetails && Object.keys(item.variationDetails).length > 0 && (
                      <div className="mt-1 space-y-0.5">
                        {Object.entries(item.variationDetails).map(([key, value]) => (
                          <p key={key} className="text-xs text-[#FAF3E0]/50">
                            {key}: {value}
                          </p>
                        ))}
                      </div>
                    )}
                    <p className="text-gold font-semibold mt-1">${parseFloat(item.price).toFixed(2)}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}
                        className="w-8 h-8 flex items-center justify-center border border-[#C9A84C]/30 rounded text-[#FAF3E0] hover:bg-[#C9A84C]/20 transition-colors"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-[#FAF3E0] text-sm w-10 text-center">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="w-8 h-8 flex items-center justify-center border border-[#C9A84C]/30 rounded text-[#FAF3E0] hover:bg-[#C9A84C]/20 transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="ml-4 p-1.5 text-red-400/60 hover:text-red-400 transition-colors"
                        aria-label="Remove"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Summary + Recommendations */}
            <div className="space-y-8">
              <div className="bg-[#1A1A1A] rounded-lg p-6 border border-[#C9A84C]/10">
                <h2 className="font-serif text-xl font-semibold mb-4">Order Summary</h2>
                <div className="flex justify-between text-[#FAF3E0]/80 mb-2">
                  <span>Subtotal</span>
                  <span>${total}</span>
                </div>
                <p className="text-xs text-[#FAF3E0]/40 mb-4">Shipping and taxes calculated at checkout</p>
                <Link
                  href="/checkout"
                  className="block w-full py-3 bg-gold text-[#0D0D0D] font-bold text-center rounded hover:bg-gold-light transition-colors uppercase tracking-wider"
                >
                  Proceed to Checkout
                </Link>
                <Link
                  href="/shop"
                  className="block w-full py-3 mt-3 border border-[#C9A84C]/40 text-gold font-semibold text-center rounded hover:bg-[#C9A84C]/10 transition-colors"
                >
                  Continue Shopping
                </Link>
              </div>

              {/* Frequently bought together */}
              {recommendations.length > 0 && (
                <div className="bg-[#1A1A1A] rounded-lg p-6 border border-[#C9A84C]/10">
                  <h2 className="font-serif text-xl font-semibold mb-4">Frequently bought together</h2>
                  <div className="space-y-4">
                    {recommendations.map((rec: { id: number; name: string; slug: string; imageUrl?: string | null; salePrice?: string | null; price?: string }) => (
                      <Link
                        key={rec.id}
                        href={`/product/${rec.slug}`}
                        className="flex gap-4 p-3 rounded-lg hover:bg-[#252525] transition-colors"
                      >
                        <div className="w-16 h-16 flex-shrink-0 rounded overflow-hidden bg-[#2A2A2A]">
                          {rec.imageUrl ? (
                            <img src={rec.imageUrl} alt={rec.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[#C9A84C]/30">
                              <ShoppingCart className="w-6 h-6" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[#FAF3E0] line-clamp-2">{rec.name}</p>
                          <p className="text-gold text-sm font-semibold mt-0.5">
                            ${parseFloat(rec.salePrice || rec.price || "0").toFixed(2)}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}
