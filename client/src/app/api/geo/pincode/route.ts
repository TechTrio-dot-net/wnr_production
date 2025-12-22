// src/app/api/geo/pincode/route.ts
import { NextResponse } from "next/server";
import { getServerCache } from "@/lib/cache";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const lat = searchParams.get("lat");
    const lng = searchParams.get("lng");
    if (!lat || !lng) return NextResponse.json({ pincode: null }, { status: 200 });

    const key = `geo:rev:${lat}:${lng}`;
    const cached = getServerCache<{ pincode?: string }>(key, 6 * 60 * 60 * 1000); // 6h
    if (cached) return NextResponse.json(cached);

    const OC_KEY = process.env.OPENCAGE_API_KEY;
    if (!OC_KEY) {
      // No key? Return null gracefully (client will fall back to manual input)
      return NextResponse.json({ pincode: null }, { status: 200 });
    }

    const url = `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(
      `${lat},${lng}`
    )}&key=${OC_KEY}&no_annotations=1&limit=1`;
    const r = await fetch(url, { next: { revalidate: 21600 } }); // 6h
    if (!r.ok) return NextResponse.json({ pincode: null }, { status: 200 });

    const js = (await r.json()) as any;
    const comp = js?.results?.[0]?.components;
    const pin =
      typeof comp?.postcode === "string"
        ? comp.postcode.replace(/\D/g, "")
        : null;

    const payload = { pincode: /^\d{6}$/.test(pin || "") ? pin : null };

    globalThis.__WNRSERVERCACHE?.set(key, { value: payload, ts: Date.now(), ttl: 6 * 60 * 60 * 1000 });
    return NextResponse.json(payload);
  } catch {
    return NextResponse.json({ pincode: null }, { status: 200 });
  }
}
