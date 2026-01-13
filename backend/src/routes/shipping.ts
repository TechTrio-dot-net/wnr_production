import { Router } from "express";
import { getAccessToken } from "../lib/eshopbox";
import { SettingsModel } from "../modules/settings/settings.model";

const router = Router();

// Accept both custom shipping envs and the existing Eshopbox base
// IMPORTANT: For shipping rate API, use the account-specific domain (e.g., wild-n-root.myeshopbox.com)
// NOT the generic wms.eshopbox.com which is for WMS operations
const SHIPPING_API_BASE_RAW =
  process.env.SHIPPING_API_BASE ||
  process.env.ESHOPBOX_BASE_URL ||
  process.env.ESHOPBOX_BASE ||
  "";

// If missing or still the generic WMS host, force known storefront domain
const DEFAULT_ACCOUNT_BASE = "https://wild-n-root.myeshopbox.com";
const SHIPPING_API_BASE =
  !SHIPPING_API_BASE_RAW || SHIPPING_API_BASE_RAW.includes("wms.eshopbox.com")
    ? DEFAULT_ACCOUNT_BASE
    : SHIPPING_API_BASE_RAW;

// Log which env var was used (for debugging) - only log once at startup
console.log("[shipping] ✅ Base URL resolved:", SHIPPING_API_BASE);
if (!SHIPPING_API_BASE_RAW || SHIPPING_API_BASE_RAW.includes("wms.eshopbox.com")) {
  console.warn("[shipping] ⚠️ Base URL was missing or generic; using fallback:", SHIPPING_API_BASE);
}

// Prefer explicit shipping token, else fall back to Eshopbox bearer token (or dynamic token via getAccessToken)
const STATIC_SHIPPING_TOKEN =
  process.env.SHIPPING_API_TOKEN ||
  process.env.ESHOPBOX_BEARER_TOKEN ||
  process.env.ESHOPBOX_API_TOKEN ||
  "";

router.options("/rate", (_req, res) => {
  // Helpful for CORS preflight visibility
  res.setHeader("Allow", "OPTIONS, POST");
  res.sendStatus(204);
});

// 🔎 TEMP: debug endpoint to prove router is mounted
router.get("/_debug", (_req, res) => {
  res.json({ ok: true, msg: "shipping router alive" });
});

// ✅ Proxy POST /rate to provider API and normalize response
router.post("/rate", async (req, res) => {
  try {
    console.log("[shipping] rate hit:", {
      method: req.method,
      body: req.body,
      headers: {
        "content-type": req.headers["content-type"],
        origin: req.headers.origin,
      },
    });

    // Check if free delivery is enabled in settings
    // Use findOne() without lean() first to ensure defaults are applied, then convert to object
    let settings = await SettingsModel.findOne();
    if (!settings) {
      // Create default settings if none exist
      settings = await SettingsModel.create({});
    }
    const freeDelivery = settings.freeDelivery === true;
    
    console.log("[shipping] Checking freeDelivery setting:", {
      hasSettings: !!settings,
      freeDelivery,
      settingsValue: settings.freeDelivery,
      settingsId: settings._id?.toString(),
    });

    // If free delivery is enabled, return 0 shipping charges immediately
    if (freeDelivery) {
      const {
        dropPincode,
        deliverySpeed = "standard",
      } = req.body || {};
      
      console.log("[shipping] Free delivery enabled, returning 0 charges");
      
      // Still return a valid response structure with 0 charges
      return res.json({
        zone: null,
        carrier: "eshopboxStandard",
        estimatedDeliveryDays: deliverySpeed === "prime" ? 1 : deliverySpeed === "express" ? 2 : 5,
        totalShippingCharges: 0,
        deliverySpeed,
        breakdown: {
          shippingBaseFreight: 0,
          expressSurcharge: 0,
          CODCollectionFees: 0,
          reverseShippingFees: 0,
          fuelSurcharge: 0,
          doorstepQCFees: 0,
          GST: 0,
        },
        freeDelivery: true,
      });
    }

    const {
      journeyType,
      pickupPincode,
      dropPincode,
      orderWeight,
      length,
      width,
      height,
      paymentMethod,
      codAmountToBeCollected,
      doorstepQc,
      deliverySpeed = "standard", // "standard" | "express" | "prime"
    } = req.body || {};

    if (
      !journeyType ||
      !pickupPincode ||
      !dropPincode ||
      !orderWeight ||
      !length ||
      !width ||
      !height ||
      !paymentMethod
    ) {
      return res.status(400).json({ message: "Missing fields for rate" });
    }

    if (!SHIPPING_API_BASE) {
      console.error("[shipping] Missing SHIPPING_API_BASE/ESHOPBOX_BASE_URL env");
      return res.status(503).json({ message: "Shipping provider base URL not configured" });
    }

    if (!SHIPPING_API_BASE) {
      console.error("[shipping] SHIPPING_API_BASE is empty! Check env vars.");
      return res.status(503).json({ message: "Shipping provider base URL not configured" });
    }

    const base = SHIPPING_API_BASE.replace(/\/$/, "");
    const url = `${base}/shipping/api/v1/calculate/rate`;

    console.log("[shipping] Calling upstream API:", {
      url,
      base: SHIPPING_API_BASE,
      resolvedBase: base,
      hasStaticToken: !!STATIC_SHIPPING_TOKEN,
    });

    // Resolve token: static if provided, else dynamic Eshopbox access token
    let bearer = STATIC_SHIPPING_TOKEN;
    if (!bearer) {
      try {
        console.log("[shipping] Fetching dynamic access token...");
        bearer = await getAccessToken();
        console.log("[shipping] Access token obtained successfully");
      } catch (e) {
        console.error("[shipping] Failed to obtain Eshopbox access token", e);
        return res.status(503).json({ message: "Shipping provider token unavailable" });
      }
    }

    const requestBody = {
      journeyType,
      pickupPincode,
      dropPincode,
      orderWeight,
      length,
      width,
      height,
      paymentMethod,
      codAmountToBeCollected,
      doorstepQc,
      // deliverySpeed is passed but Eshopbox API may not use it directly
      // We can adjust rates based on deliverySpeed if needed
    };

    // Adjust rates based on delivery speed (multiplier approach)
    // Express: 1.5x base rate, Prime: 2x base rate
    const speedMultiplier = deliverySpeed === "express" ? 1.5 : deliverySpeed === "prime" ? 2.0 : 1.0;

    console.log("[shipping] Sending request to upstream:", {
      url,
      body: requestBody,
      hasToken: !!bearer,
    });

    const upstream = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${bearer}`,
      },
      body: JSON.stringify(requestBody),
    });

    console.log("[shipping] Upstream response status:", upstream.status, upstream.statusText);

    // Read raw text first so we can log non-JSON bodies
    const rawText = await upstream.text();
    let data: any = {};
    try {
      data = rawText ? JSON.parse(rawText) : {};
    } catch (err) {
      console.error("[shipping] Failed to parse upstream JSON, raw body kept as text");
      data = { rawText };
    }

    // If upstream returns HTML (likely login page), surface a clearer error
    if (typeof data?.rawText === "string" && data.rawText.includes("<html")) {
      console.error("[shipping] Upstream returned HTML instead of JSON; check base URL/token");
      return res.status(502).json({
        message: "Shipping provider did not return JSON (got HTML). Check base URL or token.",
        upstream: data,
      });
    }

    console.log("[shipping] Upstream response data:", JSON.stringify(data, null, 2));

    if (!upstream.ok) {
      console.error("[shipping] provider error:", upstream.status, data);
      return res
        .status(upstream.status)
        .json(data || { message: "Provider error" });
    }

    // Normalize provider response into the shape your frontend already expects.
    // Example provider response (from docs):
    // {
    //   "zone": "Metro",
    //   "essentialPlan": {
    //     "eshopboxStandard": {
    //       "estimatedDeliveryDays": 5,
    //       "shippingBaseFreight": 0.0,
    //       "expressSurcharge": 0.0,
    //       "CODCollectionFees": 35.0,
    //       "reverseShippingFees": 0.0,
    //       "fuelSurcharge": 0.0,
    //       "doorstepQCFees": 0.0,
    //       "GST": 6.3,
    //       "totalShippingCharges": 41.3
    //     }
    //   }
    // }

    const plan =
      data?.essentialPlan?.eshopboxStandard ||
      data?.essentialPlan?.["eshopboxStandard"];

    console.log("[shipping] Extracted plan data:", plan);

    if (!plan) {
      console.warn("[shipping] No plan data found in response. Available keys:", Object.keys(data || {}));
      console.warn("[shipping] Full response structure:", JSON.stringify(data, null, 2));
      // If upstream responded but no plan, bubble up clearer message
      return res.status(502).json({
        message: "Shipping provider did not return a rate",
        upstream: data,
      });
    }

    // Apply speed multiplier to adjust rates and delivery time
    const baseCharge = plan?.totalShippingCharges ?? 0;
    const adjustedCharge = Math.round(baseCharge * speedMultiplier * 100) / 100; // Round to 2 decimals
    const baseDays = plan?.estimatedDeliveryDays ?? null;
    const adjustedDays = baseDays ? Math.max(1, Math.round(baseDays / speedMultiplier)) : null;

    const normalized = {
      zone: data?.zone ?? null,
      carrier: "eshopboxStandard",
      estimatedDeliveryDays: adjustedDays,
      totalShippingCharges: adjustedCharge,
      deliverySpeed, // Include in response
      breakdown: {
        shippingBaseFreight: Math.round((plan?.shippingBaseFreight ?? 0) * speedMultiplier * 100) / 100,
        expressSurcharge: plan?.expressSurcharge ?? 0,
        CODCollectionFees: plan?.CODCollectionFees ?? 0,
        reverseShippingFees: plan?.reverseShippingFees ?? 0,
        fuelSurcharge: Math.round((plan?.fuelSurcharge ?? 0) * speedMultiplier * 100) / 100,
        doorstepQCFees: plan?.doorstepQCFees ?? 0,
        GST: Math.round((plan?.GST ?? 0) * speedMultiplier * 100) / 100,
      },
      raw: data,
    };

    console.log("[shipping] Normalized response:", JSON.stringify(normalized, null, 2));

    return res.json(normalized);
  } catch (e: any) {
    console.error("[shipping] rate error:", e);
    res
      .status(500)
      .json({ message: e?.message || "Rate proxy failed", error: e });
  }
});

export default router;
