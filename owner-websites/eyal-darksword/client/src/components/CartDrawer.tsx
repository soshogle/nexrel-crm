import { useCart } from '@/contexts/CartContext';
import { Link } from 'wouter';
import { X, Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react';

export default function CartDrawer() {
  const { items, count, total, isOpen, setIsOpen, updateQuantity, removeItem } = useCart();

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 z-50 transition-opacity"
        onClick={() => setIsOpen(false)}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-[#0D0D0D] border-l border-[#C9A84C]/20 z-50 flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#C9A84C]/20">
          <div className="flex items-center gap-3">
            <ShoppingBag className="w-5 h-5 text-[#C9A84C]" />
            <h2 className="text-lg font-serif text-[#FAF3E0]">Your Cart ({count})</h2>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-[#FAF3E0]" />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <ShoppingBag className="w-16 h-16 text-[#C9A84C]/30 mb-4" />
              <p className="text-[#FAF3E0]/60 text-lg font-serif">Your cart is empty</p>
              <p className="text-[#FAF3E0]/40 text-sm mt-2">Add some items to get started</p>
              <button
                onClick={() => setIsOpen(false)}
                className="mt-6 px-6 py-2 bg-[#C9A84C] text-[#0D0D0D] font-semibold rounded hover:bg-[#B8973F] transition-colors"
              >
                Continue Shopping
              </button>
            </div>
          ) : (
            items.map((item) => (
              <div key={item.id} className="flex gap-4 bg-[#1A1A1A] rounded-lg p-4 border border-[#C9A84C]/10">
                {/* Product Image */}
                <div className="w-20 h-20 flex-shrink-0 rounded overflow-hidden bg-[#2A2A2A]">
                  {item.product?.imageUrl ? (
                    <img
                      src={item.product.imageUrl}
                      alt={item.product?.name || ''}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[#C9A84C]/30">
                      <ShoppingBag className="w-8 h-8" />
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/product/${item.product?.slug || ''}`}
                    onClick={() => setIsOpen(false)}
                    className="text-[#FAF3E0] text-sm font-medium hover:text-[#C9A84C] transition-colors line-clamp-2"
                  >
                    {item.product?.name || 'Product'}
                  </Link>

                  {/* Variation details */}
                  {item.variationDetails && Object.keys(item.variationDetails).length > 0 && (
                    <div className="mt-1 space-y-0.5">
                      {Object.entries(item.variationDetails).map(([key, value]) => (
                        <p key={key} className="text-xs text-[#FAF3E0]/50">
                          {key}: {value}
                        </p>
                      ))}
                    </div>
                  )}

                  <p className="text-[#C9A84C] font-semibold mt-1">${parseFloat(item.price).toFixed(2)}</p>

                  {/* Quantity controls */}
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      className="w-7 h-7 flex items-center justify-center border border-[#C9A84C]/30 rounded text-[#FAF3E0] hover:bg-[#C9A84C]/20 transition-colors"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="text-[#FAF3E0] text-sm w-8 text-center">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="w-7 h-7 flex items-center justify-center border border-[#C9A84C]/30 rounded text-[#FAF3E0] hover:bg-[#C9A84C]/20 transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="ml-auto p-1.5 text-red-400/60 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t border-[#C9A84C]/20 p-6 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-[#FAF3E0]/60">Subtotal</span>
              <span className="text-[#C9A84C] text-xl font-serif font-bold">${total}</span>
            </div>
            <p className="text-xs text-[#FAF3E0]/40">Shipping and taxes calculated at checkout</p>
            <Link
              href="/checkout"
              onClick={() => setIsOpen(false)}
              className="block w-full py-3 bg-[#C9A84C] text-[#0D0D0D] font-bold text-center rounded hover:bg-[#B8973F] transition-colors uppercase tracking-wider"
            >
              Proceed to Checkout
            </Link>
            <Link
              href="/cart"
              onClick={() => setIsOpen(false)}
              className="block w-full py-3 border border-[#C9A84C]/40 text-[#C9A84C] font-semibold text-center rounded hover:bg-[#C9A84C]/10 transition-colors"
            >
              View Cart
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
