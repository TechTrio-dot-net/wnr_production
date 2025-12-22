// src/routes/serviceability.ts
import { Router } from "express";
import { getAccessToken } from "../lib/eshopbox";

const router = Router();

/**
 * Required env (backend):
 *  - ESHOPBOX_ACCOUNT_SLUG  (or ESHOPBOX_WORKSPACE_SLUG)
 *  - ESHOPBOX_WAREHOUSE_PINCODE  (or ESHOPBOX_PICKUP_PINCODE)  e.g. "380015"
 *
 * We intentionally support both *_ACCOUNT_SLUG and *_WORKSPACE_SLUG,
 * and both *_WAREHOUSE_PINCODE and *_PICKUP_PINCODE so you can keep
 * your existing env names.
 */
const ACCOUNT =
  process.env.ESHOPBOX_ACCOUNT_SLUG ||
  process.env.ESHOPBOX_WORKSPACE_SLUG ||
  "";
const PICKUP_PIN = String(
  process.env.ESHOPBOX_WAREHOUSE_PINCODE || process.env.ESHOPBOX_PICKUP_PINCODE || ""
).trim();

const ES_URL = ACCOUNT
  ? `https://${ACCOUNT}.myeshopbox.com/api/v1/checkpincodeserviceability`
  : "";

// --- Types for normalization ---
type UpstreamItem = {
  type: string;
  isPickup?: string | number | boolean;
  isCOD?: string | number | boolean;
  isPrepaid?: string | number | boolean;
  index: number;
  etd: string;
};
type UpstreamResp = { data?: UpstreamItem[]; zone?: string | null; [k: string]: unknown };
type Normalized = {
  result: Array<{
    type: string;
    index: number;
    etd: string;
    serviceable: { PICKUP: boolean; COD: boolean; PREPAID: boolean };
  }>;
  zone: string | null;
  upstream?: unknown;
};

const asBool = (v: unknown): boolean => {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  const s = String(v ?? "").trim().toLowerCase();
  return s === "1" || s === "true" || s === "yes";
};

const asSix = (s: unknown) => String(s || "").trim().slice(0, 6);

function normalizeUpstream(u: UpstreamResp): Normalized {
  const list = Array.isArray(u.data) ? u.data : [];
  const result =
    list.length > 0
      ? list
          .map((it, i) => ({
            type: String(it.type || "Eshopbox"),
            index: Number(it.index ?? i + 1),
            etd: String(it.etd ?? "—"),
            serviceable: {
              PICKUP: asBool(it.isPickup),
              COD: asBool(it.isCOD),
              PREPAID: asBool(it.isPrepaid),
            },
          }))
          .sort((a, b) => (a.index ?? 99) - (b.index ?? 99))
      : [
          {
            type: "Eshopbox",
            index: 1,
            etd: "ETA available at checkout",
            serviceable: { PICKUP: true, COD: false, PREPAID: true },
          },
        ];
  return { result, zone: (u.zone as string | null) ?? null, upstream: u };
}

router.post("/", async (req, res) => {
  try {
    if (!ACCOUNT) {
      return res.status(500).json({
        message:
          "Service not configured. Set ESHOPBOX_ACCOUNT_SLUG or ESHOPBOX_WORKSPACE_SLUG on the backend.",
      });
    }
    if (!PICKUP_PIN) {
      return res.status(500).json({
        message:
          "Service not configured. Set ESHOPBOX_WAREHOUSE_PINCODE or ESHOPBOX_PICKUP_PINCODE on the backend.",
      });
    }

    const { deliveryPincode }: { deliveryPincode?: string } = req.body || {};
    const pin = asSix(deliveryPincode);

    if (!/^\d{6}$/.test(pin)) {
      return res.status(400).json({ message: "Enter a valid 6-digit deliveryPincode" });
    }
    if (!/^\d{6}$/.test(PICKUP_PIN)) {
      return res
        .status(500)
        .json({ message: "Invalid ESHOPBOX_WAREHOUSE_PINCODE / ESHOPBOX_PICKUP_PINCODE in server env" });
    }

    // IMPORTANT: send BOTH as strings (their backend expects strings)
    const body = {
      deliveryPincode: pin,            
      pickupPincode: PICKUP_PIN || "380015",       
    };

    // Get a fresh/cached Eshopbox access token using the shared token manager
    let token: string;
    try {
      token = await getAccessToken();
    } catch (err: any) {
      console.error("[serviceability] Failed to get Eshopbox access token:", err?.message || err);
      return res.status(500).json({
        message: "Failed to get Eshopbox access token",
        details:
          err?.message ||
          "Token generation failed. Check ESHOPBOX_CLIENT_ID, ESHOPBOX_SECRET (or ESOPBOX_SECRRET), and ESHOPBOX_REFRESH_TOKEN environment variables.",
      });
    }

    const upstream = await fetch(ES_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    });

    const text = await upstream.text();
    let json: UpstreamResp | { message?: string };
    try {
      json = text ? (JSON.parse(text) as UpstreamResp) : {};
    } catch {
      json = { message: text || "Upstream returned non-JSON response" };
    }

    if (!upstream.ok) {
      const msg =
        (json as { message?: string })?.message ||
        (json as { error?: { message?: string } })?.error?.message ||
        `Upstream error: ${upstream.status}`;
      return res.status(upstream.status).json({ message: msg, upstream: json });
    }

    const normalized = normalizeUpstream(json as UpstreamResp);
    return res.json(normalized);
  } catch (err) {
    console.error("[serviceability] fatal:", err);
    return res.status(503).json({ message: "Service unavailable", error: String(err) });
  }
});

export default router;
