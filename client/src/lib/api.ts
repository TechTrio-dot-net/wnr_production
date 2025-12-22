/** -------- API base helpers (browser-safe) -------- */
const RAW_BASE = process.env.NEXT_PUBLIC_API_BASE || "";
if (!RAW_BASE) {
  // Better to know immediately if misconfigured
  // eslint-disable-next-line no-console
  console.warn(
    "[api] NEXT_PUBLIC_API_BASE is empty. Client calls will go to the Next.js origin, which likely has no backend routes and may 405."
  );
}
export const API_BASE = RAW_BASE.replace(/\/+$/, ""); // trim trailing slash

export const buildUrl = (p: string) => {
  const path = p.startsWith("/") ? p : `/${p}`;
  return `${API_BASE}${path}`;
};

/** -------- Types (match backend cart shape) -------- */
export type CartItemPopulated = {
  _id: string; // cart subdoc id
  product: {
    _id: string;
    name: string;
    price: number;
    images?: (string | { url: string })[];
    stock?: number;
    isActive?: boolean;
  };
  qty: number;
  priceAtAdd: number;
};

export type CartResponse = {
  _id: string;
  user: string;
  items: CartItemPopulated[];
  updatedAt: string;
};

import { getAuthHeader, clearToken } from "./token";

/** -------- Small fetch wrapper with 401 redirect on client -------- */
async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const url = buildUrl(path);
  const authHeaders = getAuthHeader();

  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders,
      ...(init?.headers || {}),
    },
  });

  if (res.status === 401) {
    if (typeof window !== "undefined") {
      // Clear token on 401
      clearToken();
      
      // ✅ ONLY redirect to login if we're on a PROTECTED page
      // Public pages (home, products, etc.) should NOT redirect on 401
      const protectedRoutes = ["/profile", "/account", "/checkout", "/orders", "/complete-profile", "/wishlist"];
      const isProtectedPage = protectedRoutes.some(route => 
        window.location.pathname === route || window.location.pathname.startsWith(route + "/")
      );
      
      // Don't redirect if already on login page OR if on a public page
      if (!window.location.pathname.startsWith("/login") && isProtectedPage) {
        const returnTo = window.location.pathname + window.location.search;
        window.location.href = `/login?returnTo=${encodeURIComponent(returnTo)}`;
      }
    }
    throw new Error("Unauthorized");
  }

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(txt || `Request failed: ${res.status}`);
  }

  // Some endpoints (like DELETE returning {ok:true}) still send JSON
  return res.json() as Promise<T>;
}

/** -------- API facades -------- */
export const CartAPI = {
  get: () => http<CartResponse>("/api/cart"),
  addItem: (productId: string, qty = 1) =>
    http<CartResponse>("/api/cart/items", {
      method: "POST",
      body: JSON.stringify({ productId, qty }),
    }),
  updateItem: (itemId: string, qty: number) =>
    http<CartResponse>(`/api/cart/items/${itemId}`, {
      method: "PATCH",
      body: JSON.stringify({ qty }),
    }),
  removeItem: (itemId: string) =>
    http<CartResponse>(`/api/cart/items/${itemId}`, {
      method: "DELETE",
    }),
  clear: () =>
    http<{ ok: true }>("/api/cart", {
      method: "DELETE",
    }),
};

export const CheckoutAPI = {
  checkout: (shipping = 0) =>
    http<{ ok: boolean; orderId: string; total: number }>("/api/checkout", {
      method: "POST",
      body: JSON.stringify({ shipping }),
    }),
};

/** -------- Payments (Razorpay) -------- */
export type RazorpayOrder = {
  id: string;
  amount: number; // paise
  currency: string; // "INR"
  receipt?: string;
  status: string;
  notes?: Record<string, string>;
  created_at?: number;
};

export const PaymentsAPI = {
  createOrder: (amountInPaise: number, notes?: Record<string, string>) =>
    http<{ order: RazorpayOrder }>("/api/payments/create-order", {
      method: "POST",
      body: JSON.stringify({
        amountInPaise,
        currency: "INR",
        receipt: `rcpt_${Date.now()}`,
        notes: notes || {},
      }),
    }),
  verify: (payload: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }) =>
    http<{ ok: boolean }>("/api/payments/verify", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
};
