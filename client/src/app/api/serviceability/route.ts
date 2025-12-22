// app/api/serviceability/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const revalidate = 0;
export const dynamic = "force-dynamic";

/* ======================== Types ======================== */
type UpstreamItem = {
  type: string;          // e.g., "Eshopbox standard"
  isPrepaid: "0" | "1";
  index: number;         // 1 = fastest
  etd: string;           // "22 Jan, 2025" | "4 hours"
};

type UpstreamV1 = {
  data?: UpstreamItem[];
  zone?: string;
};

type NormalizedCourier = {
  type: string;
  index: number;
  etd: string;
  serviceable: {
    PREPAID: boolean;
  };
};

type NormalizedResponse = {
  result: NormalizedCourier[];
  zone: string | null;
};

type RequestBody = Partial<{
  deliveryPincode: string | number;
  accountSlug: string;
  pickupPincode: string | number;
}>;

/* ======================== Helpers ======================== */
function getErrorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === "string") return e;
  try {
    return JSON.stringify(e);
  } catch {
    return "Unexpected error";
  }
}

function parseJsonSafe<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/* ======================== Route ======================== */
export async function POST(req: Request) {
  try {
    // Parse body safely and coerce delivery pincode -> string
    const raw = (await req.json().catch(() => ({}))) as unknown;
    const body = (raw ?? {}) as RequestBody;

    const deliveryPincode = String(body.deliveryPincode ?? "").trim();
    const accountOverride = body.accountSlug;
    const pickupOverride = body.pickupPincode;

    if (!/^\d{6}$/.test(deliveryPincode)) {
      return NextResponse.json({ message: "Invalid delivery pincode" }, { status: 422 });
    }

    // Prefer env; allow body fallbacks only for DEV convenience
    const account =
      process.env.ESHOPBOX_ACCOUNT_SLUG ||
      (typeof accountOverride === "string" ? accountOverride : "") ||
      "";

    const token = process.env.ESHOPBOX_BEARER_TOKEN || "";

    const pickup =
      (typeof pickupOverride !== "undefined" ? String(pickupOverride) : undefined) ??
      process.env.ESHOPBOX_WAREHOUSE_PINCODE ??
      "";

    if (!account) {
      return NextResponse.json({ message: "Server not configured (account slug)" }, { status: 500 });
    }
    if (!token) {
      return NextResponse.json({ message: "Server not configured (bearer token)" }, { status: 500 });
    }
    if (!/^\d{6}$/.test(String(pickup))) {
      return NextResponse.json({ message: "Server not configured (warehouse pincode)" }, { status: 500 });
    }

    const url = `https://${account}.myeshopbox.com/api/v1/checkpincodeserviceability`;

    // IMPORTANT: Both pincodes must be strings to avoid upstream ClassCastException
    const payload = {
      deliveryPincode: String(deliveryPincode),
      pickupPincode: String(pickup),
    };

    const upstream = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const rawText: string = await upstream.text();
    const isJson = (upstream.headers.get("content-type") || "").includes("application/json");
    const upstreamData: UpstreamV1 = isJson ? (parseJsonSafe<UpstreamV1>(rawText) ?? {}) : {};

    if (upstream.status === 200) {
      const list = Array.isArray(upstreamData.data) ? [...upstreamData.data] : [];
      // Fastest first by lowest index
      list.sort((a, b) => (a.index ?? Number.POSITIVE_INFINITY) - (b.index ?? Number.POSITIVE_INFINITY));

      const normalized: NormalizedResponse = {
        result: list.map<NormalizedCourier>((r) => ({
          type: r.type,
          index: r.index,
          etd: r.etd,
          serviceable: {
            PREPAID: r.isPrepaid === "1",
          },
        })),
        zone: upstreamData.zone ?? null,
      };

      return NextResponse.json(normalized, { status: 200 });
    }

    if (upstream.status === 400) {
      // v1 uses 400 for not serviceable / invalid input
      return NextResponse.json(
        { notServiceable: true, message: "The pincode is not serviceable." },
        { status: 400 },
      );
    }

    // Other upstream errors → bubble up for visibility
    return NextResponse.json(
      {
        message: "Upstream error",
        status: upstream.status,
        raw: isJson ? upstreamData : rawText,
      },
      { status: 502 },
    );
  } catch (err: unknown) {
    return NextResponse.json({ message: getErrorMessage(err) }, { status: 500 });
  }
}
