// src/context/CartContext.tsx
"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { CartAPI, type CartResponse } from "@/lib/api";
import { fetchMe, isLoggedIn, currentPathWithQuery } from "@/lib/auth";

type PendingLine = { productId: string; qty: number };
const PENDING_CART_KEY = "wnr:pendingCart"; // lines saved when user isn't logged in

type Ctx = {
  cart: CartResponse | null;
  loading: boolean;
  error: string | null;
  count: number;
  subtotal: number;
  load: () => Promise<void>;
  add: (productId: string, qty?: number) => Promise<void>;
  update: (itemId: string, qty: number) => Promise<void>;
  remove: (itemId: string) => Promise<void>;
  clear: () => Promise<void>;
};

const CartContext = createContext<Ctx>({
  cart: null,
  loading: false,
  error: null,
  count: 0,
  subtotal: 0,
  load: async () => {},
  add: async () => {},
  update: async () => {},
  remove: async () => {},
  clear: async () => {},
});

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subtotal = useMemo(
    () =>
      (cart?.items ?? []).reduce((sum, it) => {
        const price = it.product?.price ?? it.priceAtAdd ?? 0;
        return sum + price * it.qty;
      }, 0),
    [cart],
  );

  const count = useMemo(
    () => (cart?.items ?? []).reduce((n, it) => n + it.qty, 0),
    [cart],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await CartAPI.get();
      setCart(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load cart");
    } finally {
      setLoading(false);
    }
  }, []);

  // Save a pending line in localStorage for post-login merge
  const pushPending = (productId: string, qty: number) => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(PENDING_CART_KEY);
      const arr: PendingLine[] = raw ? (JSON.parse(raw) as PendingLine[]) : [];
      const i = arr.findIndex((l) => l.productId === productId);
      if (i >= 0) arr[i].qty += qty;
      else arr.push({ productId, qty });
      localStorage.setItem(PENDING_CART_KEY, JSON.stringify(arr));
    } catch {
      // ignore
    }
  };

  const popPendingAll = (): PendingLine[] => {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem(PENDING_CART_KEY);
      const arr: PendingLine[] = raw ? (JSON.parse(raw) as PendingLine[]) : [];
      localStorage.removeItem(PENDING_CART_KEY);
      return arr;
    } catch {
      return [];
    }
  };

  // Merge any pending items once user is logged in
  const mergePendingIfAny = useCallback(async () => {
    const logged = await isLoggedIn();
    if (!logged) return;
    const pending = popPendingAll();
    if (!pending.length) return;

    // sequential (simple & safe)
    for (const line of pending) {
      await CartAPI.addItem(line.productId, line.qty);
    }
    await load();
  }, [load]);

  // Initial load: if logged in, load cart and merge pending items
  useEffect(() => {
    (async () => {
      const logged = await isLoggedIn();
      if (logged) {
        await load();
        await mergePendingIfAny();
      }
    })();
  }, [load, mergePendingIfAny]);

  const add = useCallback(
    async (productId: string, qty = 1) => {
      const logged = await isLoggedIn();
      if (!logged) {
        // Save intent, then redirect to login. On return, `mergePendingIfAny` runs.
        pushPending(productId, qty);
        const ret = encodeURIComponent(currentPathWithQuery());
        window.location.href = `/login?returnTo=${ret}`;
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const data = await CartAPI.addItem(productId, qty);
        setCart(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to add to cart");
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const update = useCallback(
    async (itemId: string, qty: number) => {
      setLoading(true);
      setError(null);
      try {
        const data = await CartAPI.updateItem(itemId, qty);
        setCart(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to update item");
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const remove = useCallback(async (itemId: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await CartAPI.removeItem(itemId);
      setCart(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to remove item");
    } finally {
      setLoading(false);
    }
  }, []);

  const clear = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await CartAPI.clear();
      setCart((prev) => (prev ? { ...prev, items: [] } : prev));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to clear cart");
    } finally {
      setLoading(false);
    }
  }, []);

  const value = useMemo<Ctx>(
    () => ({ cart, loading, error, count, subtotal, load, add, update, remove, clear }),
    [cart, loading, error, count, subtotal, load, add, update, remove, clear],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): Ctx {
  return useContext(CartContext);
}
