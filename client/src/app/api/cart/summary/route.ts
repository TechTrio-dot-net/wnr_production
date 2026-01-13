// src/app/api/cart/summary/route.ts
import { NextRequest, NextResponse } from "next/server";

const RAW_BASE = process.env.NEXT_PUBLIC_API_BASE || "";
const API_BASE = RAW_BASE.replace(/\/+$/, "");

export async function GET(_req: NextRequest) {
  // If your backend exposes a cart summary endpoint, proxy to it:
  if (API_BASE) {
    try {
      const res = await fetch(`${API_BASE}/api/cart/summary`, {
        cache: "no-store",
        // forward cookies if your backend uses session-based auth:
        // headers: { cookie: _req.headers.get("cookie") ?? "" },
      });
      if (res.ok) {
        const data = await res.json().catch(() => null);
        if (data) return NextResponse.json(data);
      }
    } catch {
      // fall through to safe default below
    }
  }

  // Safe default shape (prevents UI crashes)
  return NextResponse.json({
    items: [],          // expected: [{ product: {...}, qty: number }]
    subtotal: 0,
    total: 0,
    currency: "INR",
  });
}
