// src/app/api/wishlist/summary/route.ts
import { NextRequest, NextResponse } from "next/server";

const RAW_BASE = process.env.NEXT_PUBLIC_API_BASE || "";
const API_BASE = RAW_BASE.replace(/\/+$/, "");

export async function GET(_req: NextRequest) {
  if (API_BASE) {
    try {
      const res = await fetch(`${API_BASE}/api/wishlist/summary`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json().catch(() => null);
        if (data) return NextResponse.json(data);
      }
    } catch {
      // fall through
    }
  }

  // Safe minimal shape
  return NextResponse.json({
    items: [],   // expected: [{ productId: string }...] or whatever your UI uses
  });
}
