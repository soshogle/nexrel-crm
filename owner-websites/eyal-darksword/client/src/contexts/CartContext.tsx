import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import { nanoid } from 'nanoid';

interface CartItem {
  id: number;
  productId: number;
  variationId: number | null;
  quantity: number;
  price: string;
  variationDetails: Record<string, string> | null;
  product: {
    name: string;
    slug: string;
    imageUrl: string | null;
    price: string;
  } | null;
}

interface CartContextType {
  items: CartItem[];
  count: number;
  total: string;
  cartId: number | null;
  sessionId: string;
  isLoading: boolean;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  addItem: (productId: number, quantity: number, variationId?: number, variationDetails?: Record<string, string>) => Promise<void>;
  updateQuantity: (itemId: number, quantity: number) => Promise<void>;
  removeItem: (itemId: number) => Promise<void>;
  clearCart: () => Promise<void>;
  refetch: () => void;
}

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [sessionId] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('cart_session_id');
      if (stored) return stored;
      const newId = nanoid();
      localStorage.setItem('cart_session_id', newId);
      return newId;
    }
    return nanoid();
  });

  const [isOpen, setIsOpen] = useState(false);

  const cartQuery = trpc.cart.get.useQuery(
    { sessionId },
    { refetchOnWindowFocus: false }
  );

  const addItemMutation = trpc.cart.addItem.useMutation({
    onSuccess: () => cartQuery.refetch(),
  });

  const updateQuantityMutation = trpc.cart.updateQuantity.useMutation({
    onSuccess: () => cartQuery.refetch(),
  });

  const removeItemMutation = trpc.cart.removeItem.useMutation({
    onSuccess: () => cartQuery.refetch(),
  });

  const clearCartMutation = trpc.cart.clear.useMutation({
    onSuccess: () => cartQuery.refetch(),
  });

  const addItem = useCallback(async (productId: number, quantity: number, variationId?: number, variationDetails?: Record<string, string>) => {
    await addItemMutation.mutateAsync({
      sessionId,
      productId,
      quantity,
      variationId,
      variationDetails,
    });
    setIsOpen(true);
  }, [sessionId, addItemMutation]);

  const updateQuantity = useCallback(async (itemId: number, quantity: number) => {
    await updateQuantityMutation.mutateAsync({ itemId, quantity });
  }, [updateQuantityMutation]);

  const removeItem = useCallback(async (itemId: number) => {
    await removeItemMutation.mutateAsync({ itemId });
  }, [removeItemMutation]);

  const clearCart = useCallback(async () => {
    if (cartQuery.data?.cartId) {
      await clearCartMutation.mutateAsync({ cartId: cartQuery.data.cartId });
    }
  }, [cartQuery.data?.cartId, clearCartMutation]);

  return (
    <CartContext.Provider value={{
      items: (cartQuery.data?.items || []) as CartItem[],
      count: cartQuery.data?.count || 0,
      total: String(cartQuery.data?.total || '0.00'),
      cartId: cartQuery.data?.cartId || null,
      sessionId,
      isLoading: cartQuery.isLoading,
      isOpen,
      setIsOpen,
      addItem,
      updateQuantity,
      removeItem,
      clearCart,
      refetch: cartQuery.refetch,
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
