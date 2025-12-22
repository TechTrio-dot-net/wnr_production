// src/routes/shippingAdmin.ts
import { Router, type Request, type Response, type NextFunction } from "express";
import jwt from "jsonwebtoken";
import { Types } from "mongoose";
import { connectDB } from "../lib/db";
import OrderModel from "../modules/orders/Order";
import { Product } from "../modules/catalog/products/product.model";
import { getAccessToken } from "../lib/eshopbox";
import { logger } from "../lib/logger";

const router = Router();

// Add a simple test route to verify router is working
router.use((req, res, next) => {
  if (req.path.includes("/shipping") || req.path.includes("/admin/shipping")) {
    console.log("[shippingAdmin] Router hit - Path:", req.path, "Method:", req.method);
  }
  next();
});

/* ============================= ENV ============================= */
const ADMIN_COOKIE_NAME = process.env.ADMIN_COOKIE_NAME || "tt_admin";
const JWT_SECRET = process.env.JWT_SECRET || "";
const ESHOPBOX_BASE = process.env.ESHOPBOX_BASE || "https://wild-n-root.myeshopbox.com";

/** pickup location: support either var or env - all fields from env */
const PICKUP_LOCATION_CODE = process.env.ESHOPBOX_PICKUP_LOCATION_CODE || "AMD02";
const PICKUP_LOCATION_NAME = process.env.ESHOPBOX_PICKUP_LOCATION_NAME || "";
const PICKUP_COMPANY_NAME = process.env.ESHOPBOX_PICKUP_COMPANY_NAME || "";
const PICKUP_CONTACT_PERSON = process.env.ESHOPBOX_PICKUP_CONTACT_PERSON || "";
const PICKUP_CONTACT_NUMBER = process.env.ESHOPBOX_PICKUP_CONTACT_NUMBER || process.env.ESHOPBOX_PICKUP_CONTACT_PHONE || "";
const PICKUP_ADDRESS_LINE1 = process.env.ESHOPBOX_PICKUP_ADDRESS_LINE1 || "";
const PICKUP_ADDRESS_LINE2 = process.env.ESHOPBOX_PICKUP_ADDRESS_LINE2 || "";
const PICKUP_CITY = process.env.ESHOPBOX_PICKUP_CITY || "";
const PICKUP_STATE = process.env.ESHOPBOX_PICKUP_STATE || "";
const PICKUP_PINCODE = process.env.ESHOPBOX_PICKUP_PINCODE || "";
const PICKUP_COUNTRY = process.env.ESHOPBOX_PICKUP_COUNTRY || "India";
const PICKUP_GSTIN = process.env.ESHOPBOX_PICKUP_GSTIN || "";

/** Optional fallbacks when you *build* a payload - use same env vars as eshopbox-orders.ts */
const FALLBACK_LEN = parseFloat(process.env.ESHOPBOX_PKG_LENGTH_CM || process.env.SHIP_LEN_CM || "12");
const FALLBACK_BRD = parseFloat(process.env.ESHOPBOX_PKG_BREADTH_CM || process.env.SHIP_BRD_CM || "8");
const FALLBACK_HGT = parseFloat(process.env.ESHOPBOX_PKG_HEIGHT_CM || process.env.SHIP_HGT_CM || "9.5");
const FALLBACK_WT = parseFloat(process.env.ESHOPBOX_PKG_WEIGHT_G || process.env.SHIP_WT_G || "27");

if (!JWT_SECRET) console.error("[shippingAdmin] WARN: JWT_SECRET missing");
if (!PICKUP_LOCATION_CODE) console.error("[shippingAdmin] WARN: pickup location code missing");

/* ========================= Types / Helpers ========================= */

type Decoded = { uid?: string; role?: string; email?: string } | string;

function isObj(x: unknown): x is Record<string, any> {
  return !!x && typeof x === "object";
}

function pickErrorMessage(x: any, textFallback = "Unknown error"): string {
  if (!x) return textFallback;
  if (typeof x === "string") return x;
  if (x.message && typeof x.message === "string") return x.message;
  if (x.error) {
    if (typeof x.error === "string") return x.error;
    if (x.error && typeof x.error.description === "string") return x.error.description;
  }
  if (typeof x.description === "string") return x.description;
  return textFallback;
}

/** Cast anything to a valid ObjectId deterministically */
function toObjectId(x: unknown): Types.ObjectId {
  return new Types.ObjectId(String(x));
}

/** Minimal response Eshopbox returns (fields we persist) */
type EshopboxCreateOrderResponse = {
  courierName?: string;
  trackingId: string;
  label_url?: string;  // snake_case variant
  labelUrl?: string;   // camelCase variant
  shipmentId: string;
  routingCode?: string;
  labelStream?: string;
  shippingMode?: string;
  gstin?: string;
  transporterID?: string;
};

function looksLikeEshopboxSuccess(x: any): x is EshopboxCreateOrderResponse {
  // Accept either label_url (snake_case) or labelUrl (camelCase)
  const hasLabel = (typeof x.label_url === "string" && x.label_url.trim()) || 
                   (typeof x.labelUrl === "string" && x.labelUrl.trim());
  
  return (
    isObj(x) &&
    typeof x.trackingId === "string" &&
    typeof x.shipmentId === "string" &&
    hasLabel
  );
}

/** Admin guard – reads ADMIN cookie and verifies JWT */
function requireAdmin(req: Request, res: Response, next: NextFunction) {
  console.log("[shippingAdmin] ========== requireAdmin MIDDLEWARE CALLED ==========");
  console.log("[shippingAdmin] Method:", req.method);
  console.log("[shippingAdmin] Path:", req.path);
  console.log("[shippingAdmin] Original URL:", req.originalUrl);
  console.log("[shippingAdmin] Route:", req.route?.path);
  try {
    console.log("[shippingAdmin] requireAdmin check...");
    let token: string | undefined = req.cookies?.[ADMIN_COOKIE_NAME];
    console.log("[shippingAdmin] Cookie token present:", !!token);

    if (!token) {
      // Check all possible header variations (Express headers can be case-sensitive)
      const authHeader = 
        (typeof req.headers.authorization === "string" ? req.headers.authorization : undefined) ||
        (typeof req.headers.Authorization === "string" ? req.headers.Authorization : undefined) ||
        (typeof (req.headers as any)["authorization"] === "string" ? (req.headers as any)["authorization"] : undefined);
      
      console.log("[shippingAdmin] Auth header present:", !!authHeader);
      if (authHeader) {
        console.log("[shippingAdmin] Auth header preview:", authHeader.substring(0, 30) + "...");
      } else {
        // Debug: log all header keys to see what we're receiving
        const headerKeys = Object.keys(req.headers);
        console.log("[shippingAdmin] All header keys:", headerKeys);
        const authKeys = headerKeys.filter(k => k.toLowerCase().includes("auth"));
        console.log("[shippingAdmin] Auth-related keys:", authKeys);
        if (authKeys.length > 0) {
          authKeys.forEach(k => {
            console.log(`[shippingAdmin] ${k}:`, typeof req.headers[k], Array.isArray(req.headers[k]) ? req.headers[k] : String(req.headers[k]).substring(0, 50));
          });
        }
      }

      if (authHeader) {
        if (authHeader.startsWith("Bearer ") || authHeader.startsWith("bearer ")) {
          const extractedToken = authHeader.slice(7).trim();
          token = extractedToken;
          console.log("[shippingAdmin] Extracted Bearer token (len):", extractedToken.length);
        } else {
          console.log("[shippingAdmin] Auth header doesn't start with 'Bearer '. Full header:", authHeader);
        }
      }
    }

    if (!token) {
      console.log("[shippingAdmin] No token found in cookie or header");
      return res.status(401).json({ message: "No session" });
    }

    if (!JWT_SECRET) {
      console.error("[shippingAdmin] JWT_SECRET is missing");
      return res.status(500).json({ message: "Server misconfigured (JWT secret missing)" });
    }

    console.log("[shippingAdmin] Verifying token...");
    const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ["HS256"] }) as Decoded;
    console.log("[shippingAdmin] Decoded:", JSON.stringify(decoded));

    if (!decoded || typeof decoded !== "object") {
      console.log("[shippingAdmin] Invalid decoded payload");
      return res.status(401).json({ message: "Invalid session" });
    }

    const isAdmin = decoded.role === "admin";
    const allowEmails = (process.env.ADMIN_EMAILS || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    if (!(isAdmin || (decoded.email && allowEmails.includes(decoded.email)))) {
      console.log("[shippingAdmin] Access denied. Role:", decoded.role, "Email:", decoded.email);
      return res.status(403).json({ message: "Admin only" });
    }

    (req as any).admin = decoded;
    next();
  } catch (e: any) {
    console.error("[shippingAdmin] Auth error:", e?.message || e);
    if (e?.name === "JsonWebTokenError") {
      return res.status(401).json({ message: "Invalid token" });
    }
    if (e?.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Token expired" });
    }
    return res.status(401).json({ message: "Unauthorized: " + (e?.message || "Unknown error") });
  }
}

/** Fallback builder if UI doesn't send body */
async function buildMinimalFromOrder(order: any) {
  const addr = order?.addressSnapshot || {};
  const items = Array.isArray(order?.items) ? order.items : [];

  // Fetch products to get eshopboxProductId
  const productIds = items
    .map((it: any) => it.product)
    .filter((id: any) => id && Types.ObjectId.isValid(id));
  
  const products = await Product.find({ _id: { $in: productIds } })
    .select("eshopboxProductId images")
    .lean();
  
  const productMap = new Map(
    products.map((p: any) => [String(p._id), p])
  );

  const ebItems = await Promise.all(
    items.map(async (it: any) => {
      const productId = it.product ? String(it.product) : null;
      const product = productId ? productMap.get(productId) : null;
      
      // Use eshopboxProductId if available, otherwise fallback to product ObjectId or name
      const itemID = product?.eshopboxProductId 
        ? String(product.eshopboxProductId)
        : (productId || String(it.name || "SKU"));
      
      // Get product image from populated product or fallback
      let productImageUrl = "https://via.placeholder.com/300.png?text=Item";
      if (product?.images && Array.isArray(product.images) && product.images.length > 0) {
        productImageUrl = String(product.images[0].url || product.images[0]);
      } else if (typeof it.imageUrl === "string" && it.imageUrl.trim()) {
        productImageUrl = it.imageUrl.trim();
      }

      return {
        itemID,
        productTitle: String(it.name || "Item"),
        quantity: Number(it.qty || 1),
        itemTotal: Number(it.price || 0) * Number(it.qty || 1),
        productImageUrl,
      };
    })
  );

  return {
    shipmentId: `SHIP_${String(order.orderNumber || order._id).replace(/\s+/g, "_")}`,
    isCOD: (order?.payment?.method || "razorpay") === "cod",
    invoiceTotal: Number(order?.total || 0),

    shippingAddress: {
      customerName: addr.name || "Customer",
      addressLine1: addr.line1 || "",
      addressLine2: addr.line2 || "",
      city: addr.city || "",
      state: addr.state || "",
      pincode: addr.pincode || "",
      country: "India",
      contactPhone: addr.phone || "",
      email: order?.user?.email || "",
    },

    items: ebItems,

    // Eshopbox expects shipmentDimension object with numeric values (not separate string fields)
    shipmentDimension: {
      length: FALLBACK_LEN,
      breadth: FALLBACK_BRD,
      height: FALLBACK_HGT,
      weight: FALLBACK_WT,
    },

    pickupLocation: {
      locationCode: PICKUP_LOCATION_CODE,
      ...(PICKUP_LOCATION_NAME ? { locationName: PICKUP_LOCATION_NAME } : {}),
      ...(PICKUP_COMPANY_NAME ? { companyName: PICKUP_COMPANY_NAME } : {}),
      ...(PICKUP_CONTACT_PERSON ? { contactPerson: PICKUP_CONTACT_PERSON } : {}),
      ...(PICKUP_CONTACT_NUMBER ? { contactNumber: PICKUP_CONTACT_NUMBER } : {}),
      ...(PICKUP_ADDRESS_LINE1 ? { addressLine1: PICKUP_ADDRESS_LINE1 } : {}),
      ...(PICKUP_ADDRESS_LINE2 ? { addressLine2: PICKUP_ADDRESS_LINE2 } : {}),
      ...(PICKUP_CITY ? { city: PICKUP_CITY } : {}),
      ...(PICKUP_STATE ? { state: PICKUP_STATE } : {}),
      ...(PICKUP_PINCODE ? { pincode: PICKUP_PINCODE } : {}),
      ...(PICKUP_COUNTRY ? { country: PICKUP_COUNTRY } : {}),
      ...(PICKUP_GSTIN ? { gstin: PICKUP_GSTIN } : {}),
    },
  };
}

/** Validate the *required* fields presence */
function validateMinimalPayload(p: any): string | null {
  if (!isObj(p)) return "Body must be an object";

  if (!p.shipmentId) return "shipmentId is required";
  if (typeof p.isCOD !== "boolean") return "isCOD is required (boolean)";
  if (typeof p.invoiceTotal !== "number") return "invoiceTotal is required (number)";

  const sa = p.shippingAddress;
  if (!isObj(sa)) return "shippingAddress is required";
  for (const key of ["customerName", "addressLine1", "city", "state", "pincode", "country"]) {
    if (!sa[key]) return `shippingAddress.${key} is required`;
  }

  if (!Array.isArray(p.items) || p.items.length === 0) return "items[] is required";
  for (const [idx, it] of p.items.entries()) {
    if (!isObj(it)) return `items[${idx}] must be an object`;
    if (!it.itemID) return `items[${idx}].itemID is required`;
    if (!it.productTitle) return `items[${idx}].productTitle is required`;
    if (typeof it.quantity !== "number") return `items[${idx}].quantity is required (number)`;
    if (typeof it.itemTotal !== "number") return `items[${idx}].itemTotal is required (number)`;
    if (!it.productImageUrl) return `items[${idx}].productImageUrl is required (url)`;
  }

  // Validate shipmentDimension (Eshopbox expects an object with numeric values)
  const dims = p.shipmentDimension;
  if (!isObj(dims)) return "shipmentDimension is required (object)";
  for (const key of ["length", "breadth", "height", "weight"]) {
    if (typeof dims[key] !== "number" || dims[key] <= 0) {
      return `shipmentDimension.${key} is required (positive number)`;
    }
  }

  if (!isObj(p.pickupLocation) || !p.pickupLocation.locationCode) {
    return "pickupLocation.locationCode is required";
  }
  
  // Eshopbox requires these fields even when locationCode is provided
  const requiredPickupFields = ["contactNumber", "addressLine1", "city", "state", "pincode"];
  for (const field of requiredPickupFields) {
    if (!p.pickupLocation[field] || (typeof p.pickupLocation[field] === "string" && !p.pickupLocation[field].trim())) {
      return `pickupLocation.${field} is required (set ESHOPBOX_PICKUP_${field.toUpperCase()} in env or provide in payload)`;
    }
  }

  return null;
}

/* =============================== Routes =============================== */

/**
 * GET /api/admin/shipping/health
 * Health check endpoint
 */
router.get("/health", (_req: Request, res: Response) => {
  console.log("[shippingAdmin] Health check endpoint hit");
  return res.json({ ok: true, service: "shippingAdmin", timestamp: new Date().toISOString() });
});

// Test route to verify routing works
router.get("/test", (_req: Request, res: Response) => {
  console.log("[shippingAdmin] Test route hit");
  return res.json({ ok: true, message: "shippingAdmin router is working" });
});

/**
 * POST /api/admin/shipping/:orderId/create
 */
router.post("/:orderId/create", requireAdmin, async (req: Request, res: Response) => {
  console.log("[shippingAdmin] ========== POST HANDLER CALLED ==========");
  console.log("[shippingAdmin] Full URL:", req.originalUrl);
  console.log("[shippingAdmin] Method:", req.method);
  console.log("[shippingAdmin] Path:", req.path);
  console.log("[shippingAdmin] Params:", JSON.stringify(req.params));
  console.log("[shippingAdmin] Body keys:", Object.keys(req.body || {}));
  try {
    console.log("[shippingAdmin] POST /:orderId/create - Request received");
    await connectDB();

    // ✅ assert param type to avoid string | undefined
    const { orderId } = req.params as { orderId: string };
    console.log("[shippingAdmin] Order ID:", orderId);
    
    if (!Types.ObjectId.isValid(orderId)) {
      console.log("[shippingAdmin] Invalid order ID format:", orderId);
      return res.status(400).json({ message: "Invalid order id" });
    }

    const order = await OrderModel.findById(orderId).lean();
    if (!order) return res.status(404).json({ message: "Order not found" });

    if (order.status !== "paid") {
      return res.status(409).json({ message: "Only paid orders can be shipped" });
    }

    // Idempotency
    const st = order.shipment?.status as "created" | "label_generated" | "cancelled" | "error" | undefined;
    if (st && st !== "error" && st !== "cancelled") {
      return res.status(409).json({ message: "Shipment already exists", shipment: order.shipment });
    }

    // Prefer UI-provided body, else fallback
    const incoming = isObj(req.body) ? req.body : {};
    console.log("[shippingAdmin] Incoming body keys:", Object.keys(incoming));
    console.log("[shippingAdmin] Incoming body (raw):", JSON.stringify(incoming, null, 2));
    
    let payload: any = Object.keys(incoming).length ? incoming : await buildMinimalFromOrder(order);
    
    // Transform payload to match Eshopbox API format
    // Frontend may send shipmentLength/shipmentBreadth/etc as strings, but Eshopbox needs shipmentDimension object with numbers
    if ((payload as any).shipmentLength || (payload as any).shipmentBreadth || (payload as any).shipmentHeight || (payload as any).shipmentWeight) {
      console.log("[shippingAdmin] Converting separate dimension fields to shipmentDimension object...");
      const p = payload as any;
      payload = {
        ...payload,
        shipmentDimension: {
          length: parseFloat(String(p.shipmentLength || FALLBACK_LEN)),
          breadth: parseFloat(String(p.shipmentBreadth || FALLBACK_BRD)),
          height: parseFloat(String(p.shipmentHeight || FALLBACK_HGT)),
          weight: parseFloat(String(p.shipmentWeight || FALLBACK_WT)),
        },
      };
      // Remove old fields
      delete (payload as any).shipmentLength;
      delete (payload as any).shipmentBreadth;
      delete (payload as any).shipmentHeight;
      delete (payload as any).shipmentWeight;
      console.log("[shippingAdmin] Converted dimensions:", JSON.stringify((payload as any).shipmentDimension, null, 2));
    }
    
    // Ensure pickupLocation has all required fields (Eshopbox requires these even with locationCode)
    if ((payload as any).pickupLocation) {
      const pl = (payload as any).pickupLocation;
      
      // Add missing fields from environment variables
      if (!pl.contactNumber && PICKUP_CONTACT_NUMBER) {
        console.log("[shippingAdmin] Adding contactNumber to pickupLocation from env");
        pl.contactNumber = PICKUP_CONTACT_NUMBER;
      }
      if (!pl.addressLine1 && PICKUP_ADDRESS_LINE1) {
        console.log("[shippingAdmin] Adding addressLine1 to pickupLocation from env");
        pl.addressLine1 = PICKUP_ADDRESS_LINE1;
      }
      if (!pl.city && PICKUP_CITY) {
        console.log("[shippingAdmin] Adding city to pickupLocation from env");
        pl.city = PICKUP_CITY;
      }
      if (!pl.state && PICKUP_STATE) {
        console.log("[shippingAdmin] Adding state to pickupLocation from env");
        pl.state = PICKUP_STATE;
      }
      if (!pl.pincode && PICKUP_PINCODE) {
        console.log("[shippingAdmin] Adding pincode to pickupLocation from env");
        pl.pincode = PICKUP_PINCODE;
      }
      if (!pl.country && PICKUP_COUNTRY) {
        console.log("[shippingAdmin] Adding country to pickupLocation from env");
        pl.country = PICKUP_COUNTRY;
      }
      if (!pl.locationName && PICKUP_LOCATION_NAME) {
        pl.locationName = PICKUP_LOCATION_NAME;
      }
      if (!pl.companyName && PICKUP_COMPANY_NAME) {
        pl.companyName = PICKUP_COMPANY_NAME;
      }
      if (!pl.contactPerson && PICKUP_CONTACT_PERSON) {
        pl.contactPerson = PICKUP_CONTACT_PERSON;
      }
      if (!pl.addressLine2 && PICKUP_ADDRESS_LINE2) {
        pl.addressLine2 = PICKUP_ADDRESS_LINE2;
      }
      if (!pl.gstin && PICKUP_GSTIN) {
        pl.gstin = PICKUP_GSTIN;
      }
      
      // Validate required fields
      const requiredFields = {
        contactNumber: pl.contactNumber || PICKUP_CONTACT_NUMBER,
        addressLine1: pl.addressLine1 || PICKUP_ADDRESS_LINE1,
        city: pl.city || PICKUP_CITY,
        state: pl.state || PICKUP_STATE,
        pincode: pl.pincode || PICKUP_PINCODE,
      };
      
      const missingFields = Object.entries(requiredFields)
        .filter(([_, value]) => !value)
        .map(([key]) => key);
      
      if (missingFields.length > 0) {
        console.error("[shippingAdmin] Missing required pickupLocation fields:", missingFields);
        return res.status(400).json({
          message: `pickupLocation missing required fields: ${missingFields.join(", ")}. Set ESHOPBOX_PICKUP_* environment variables.`,
          missingFields,
        });
      }
      
      console.log("[shippingAdmin] pickupLocation fields:", Object.keys(pl));
    }
    
    const err = validateMinimalPayload(payload);
    if (err) {
      console.log("[shippingAdmin] Validation error:", err);
      return res.status(400).json({ message: err });
    }
    console.log("[shippingAdmin] Payload validated, calling Eshopbox...");
    console.log("[shippingAdmin] Eshopbox URL:", `${ESHOPBOX_BASE}/api/v1/shipping/order`);
    console.log("[shippingAdmin] Final payload being sent to Eshopbox:", JSON.stringify(payload, null, 2));
    console.log("[shippingAdmin] Payload dimensions:", JSON.stringify((payload as any).shipmentDimension || "MISSING", null, 2));
    console.log("[shippingAdmin] Payload pickupLocation:", JSON.stringify((payload as any).pickupLocation || "MISSING", null, 2));
    
    // Get access token using the token refresh mechanism (same as eshopbox-orders.ts)
    let accessToken: string;
    try {
      logger.info("[shippingAdmin] Getting Eshopbox access token...");
      accessToken = await getAccessToken();
      const tokenLength = accessToken.length;
      const tokenPreview = `${accessToken.substring(0, 20)}...${accessToken.substring(tokenLength - 10)}`;
      console.log("[shippingAdmin] Eshopbox token obtained successfully");
      console.log("[shippingAdmin] Eshopbox token length:", tokenLength);
      console.log("[shippingAdmin] Eshopbox token preview:", tokenPreview);
    } catch (tokenError: any) {
      logger.error("[shippingAdmin] Failed to get Eshopbox access token", { error: tokenError });
      console.error("[shippingAdmin] Token error:", tokenError?.message || tokenError);
      return res.status(500).json({ 
        message: "Failed to get Eshopbox access token",
        details: tokenError?.message || "Token generation failed. Check ESHOPBOX_CLIENT_ID, ESHOPBOX_SECRET, and ESHOPBOX_REFRESH_TOKEN environment variables."
      });
    }

    // Call Eshopbox
    const requestHeaders = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    };
    const headerTokenPreview = `${accessToken.substring(0, 20)}...${accessToken.substring(accessToken.length - 10)}`;
    console.log("[shippingAdmin] Request headers:", {
      "Content-Type": requestHeaders["Content-Type"],
      "Authorization": `Bearer ${headerTokenPreview}`,
    });
    
    const resp = await fetch(`${ESHOPBOX_BASE}/api/v1/shipping/order`, {
      method: "POST",
      headers: requestHeaders,
      body: JSON.stringify(payload),
    });

    console.log("[shippingAdmin] Eshopbox response status:", resp.status);
    console.log("[shippingAdmin] Eshopbox response statusText:", resp.statusText);
    // Log important headers
    const contentType = resp.headers.get("content-type");
    const contentLength = resp.headers.get("content-length");
    console.log("[shippingAdmin] Eshopbox response headers - Content-Type:", contentType, "Content-Length:", contentLength);

    let body: any = null;
    let text = "";
    try {
      body = await resp.json();
      console.log("[shippingAdmin] Eshopbox response body (JSON):", JSON.stringify(body, null, 2));
    } catch (jsonError) {
      try { 
        text = await resp.text(); 
        console.log("[shippingAdmin] Eshopbox response body (text):", text);
      } catch (textError) { 
        console.log("[shippingAdmin] Failed to read response body:", textError);
      }
    }

    if (!resp.ok) {
      console.error("[shippingAdmin] Eshopbox API error:");
      console.error("[shippingAdmin] Status:", resp.status);
      console.error("[shippingAdmin] Status Text:", resp.statusText);
      console.error("[shippingAdmin] Response body:", body || text);
      console.error("[shippingAdmin] Full error details:", {
        status: resp.status,
        statusText: resp.statusText,
        body: body || text,
        contentType: resp.headers.get("content-type"),
      });
      
      const msg = pickErrorMessage(body, text || "Eshopbox error");
      console.error("[shippingAdmin] Extracted error message:", msg);
      return res.status(resp.status).json({ 
        message: msg,
        details: body || text,
        status: resp.status,
      });
    }
    if (!looksLikeEshopboxSuccess(body)) {
      console.error("[shippingAdmin] Invalid Eshopbox response structure:");
      console.error("[shippingAdmin] Expected: trackingId, shipmentId, and (label_url OR labelUrl)");
      console.error("[shippingAdmin] Received:", JSON.stringify(body, null, 2));
      return res.status(502).json({ 
        message: "Invalid response from Eshopbox",
        details: body,
      });
    }

    // Handle both label_url (snake_case) and labelUrl (camelCase) from Eshopbox
    const labelUrl = body.label_url || body.labelUrl || "";
    
    console.log("[shippingAdmin] ✅ Eshopbox order created successfully!");
    console.log("[shippingAdmin] Tracking ID:", body.trackingId);
    console.log("[shippingAdmin] Courier:", body.courierName);
    console.log("[shippingAdmin] Label URL:", labelUrl);

    const toSave = {
      createdAt: new Date(),
      provider: "eshopbox" as const,
      status: "label_generated" as const, // Changed from "created" since we have a label
      courierName: body.courierName || null,
      trackingId: body.trackingId,
      labelUrl: labelUrl,
      routingCode: body.routingCode || null,
      shippingMode: body.shippingMode || null,
      gstin: body.gstin || null,
      transporterID: body.transporterID || null,
      rawResponse: body,
      eshopbox: {
        shipmentId: body.shipmentId,
        labelUrl: labelUrl,
      },
    };

    // ✅ Ensure _id is a definite ObjectId (fixes your TS 2345)
    await OrderModel.updateOne({ _id: toObjectId(order._id) }, { $set: { shipment: toSave } });

    return res.json({
      ok: true,
      orderId: String(order._id),
      orderNumber: order.orderNumber,
      shipment: toSave,
    });
  } catch (e: any) {
    console.error("[shippingAdmin] create error:", e?.message || e);
    return res.status(500).json({ message: e?.message || "Failed to create shipment" });
  }
});

/**
 * GET /api/admin/shipping/:orderId
 */
router.get("/:orderId", requireAdmin, async (req: Request, res: Response) => {
  try {
    await connectDB();

    // ✅ assert param type to avoid string | undefined
    const { orderId } = req.params as { orderId: string };
    if (!Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ message: "Invalid order id" });
    }

    const order = await OrderModel.findById(orderId)
      .select("orderNumber shipment status")
      .lean();

    if (!order) return res.status(404).json({ message: "Order not found" });

    return res.json({
      ok: true,
      orderId: String(order._id),
      orderNumber: order.orderNumber,
      status: order.status,
      shipment: order.shipment || null,
    });
  } catch (e: any) {
    console.error("[shippingAdmin] get error:", e?.message || e);
    return res.status(500).json({ message: e?.message || "Failed to load shipment" });
  }
});

export default router;
