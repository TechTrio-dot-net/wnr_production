// src/app/api/geo/my-pincode/route.ts
import { NextResponse } from "next/server";
import { getServerCache } from "@/lib/cache";

function getClientIp(req: Request) {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();
  return undefined; // Next runtime will still geolocate by host IP
}

export async function GET(req: Request) {
  try {
    const ip = getClientIp(req) || "me";
    const cache = getServerCache<{ pincode?: string }>(`geo:ip:${ip}`, 60 * 60 * 1000);
    if (cache) return NextResponse.json(cache);

    // Example: ipapi.co — returns JSON with "postal": "560001"
    // You may replace with your preferred provider + API key if needed.
    const url = ip === "me" ? "https://ipapi.co/json/" : `https://ipapi.co/${encodeURIComponent(ip)}/json/`;
    const r = await fetch(url, { next: { revalidate: 3600 } });
    if (!r.ok) return NextResponse.json({ pincode: null }, { status: 200 });

    const js = await r.json();
    const pincode = typeof js?.postal === "string" ? js.postal.replace(/\D/g, "") : null;
    const payload = { pincode: /^\d{6}$/.test(pincode || "") ? pincode : null };

    // cache 1h
    globalThis.__WNRSERVERCACHE?.set(`geo:ip:${ip}`, { value: payload, ts: Date.now(), ttl: 60 * 60 * 1000 });
    return NextResponse.json(payload);
  } catch {
    return NextResponse.json({ pincode: null }, { status: 200 });
  }
}
