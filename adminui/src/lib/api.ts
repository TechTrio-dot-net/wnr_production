// ./src/lib/api.ts

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || "").replace(/\/+$/, "");

function isDev() {
  return typeof process !== "undefined" && process.env.NODE_ENV !== "production";
}

export async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const isGet = !init?.method || init?.method?.toUpperCase() === "GET";

  // If API_BASE is empty → same-origin `/api/...` works with Next rewrites.
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const url = API_BASE ? `${API_BASE}${normalized}` : normalized;

  if (isDev() && !process.env.NEXT_PUBLIC_API_BASE) {
    console.warn("[api.ts] Using same-origin API via Next rewrite:", url);
  }

  // Build headers and attach Authorization if an admin token exists in localStorage
  const baseHeaders: Record<string, string> = {
    Accept: "application/json",
    ...(isGet ? {} : { "Content-Type": "application/json" }),
    ...(init?.headers as Record<string, string> || {}),
  };

  try {
    if (typeof window !== "undefined") {
      const token = window.localStorage.getItem("wnr_admin_token");
      if (token) baseHeaders["Authorization"] = `Bearer ${token}`;
    }
  } catch {
    // Ignore localStorage errors
  }

  const res = await fetch(url, {
    headers: baseHeaders,
    ...init,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `HTTP ${res.status}`);
  }

  if (res.status === 204) return undefined as unknown as T;
  return (await res.json()) as T;
}

/**
 * Build authorization headers for client-side fetches.
 * Returns `Accept: application/json` plus `Authorization` when a token exists.
 */
export function authHeaders(contentType?: string): Record<string, string> {
  const h: Record<string, string> = { Accept: "application/json" };
  if (contentType) h["Content-Type"] = contentType;
  try {
    if (typeof window !== "undefined") {
      const token = window.localStorage.getItem("wnr_admin_token");
      if (token) h["Authorization"] = `Bearer ${token}`;
    }
  } catch { }
  return h;
}

/* ======================= Runtime guards & helpers ======================= */

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null;
}

function hasKey<K extends string>(
  x: unknown,
  key: K
): x is Record<K, unknown> {
  return isRecord(x) && key in x;
}

type ApiEnvelope<T> = { data: T };

function unwrap<T>(payload: unknown): T {
  if (hasKey(payload, "data")) {
    return (payload as ApiEnvelope<T>).data;
  }
  return payload as T;
}

function unwrapArray(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  if (hasKey(payload, "data")) {
    const data = (payload as { data?: unknown }).data;
    if (Array.isArray(data)) return data;
  }
  return [];
}

function str(v: unknown): string {
  return typeof v === "string" ? v : String(v ?? "");
}

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function bool(v: unknown): boolean | undefined {
  if (v === true || v === false) return v;
  return undefined;
}

function optStr(obj: unknown, key: string): string | undefined {
  if (!isRecord(obj)) return undefined;
  const v = obj[key];
  return typeof v === "string" ? v : undefined;
}

function optStrNull(obj: unknown, key: string): string | null | undefined {
  if (!isRecord(obj)) return undefined;
  const v = obj[key];
  if (v == null) return null;
  return typeof v === "string" ? v : String(v ?? "");
}

function cleanse<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) if (v !== undefined) out[k] = v;
  return out as Partial<T>;
}

/* ======================= Dashboard ======================= */
export interface DashboardData {
  totalSales: number;
  totalOrders: number;
  totalCustomers: number;
  lowStockAlerts: number;
  salesTrend: { labels: string[]; data: number[] };
  additionalMetrics?: {
    paidOrders: number;
    pendingOrders: number;
    averageOrderValue: number;
    conversionRate: number;
  };
  recentOrders?: Array<{
    orderNumber: string;
    total: number;
    status: string;
    customerName: string;
    date: string;
  }>;
  topProducts?: Array<{
    name: string;
    quantity: number;
    revenue: number;
  }>;
}
export async function fetchDashboardData(days?: number): Promise<DashboardData> {
  const qs = days ? `?days=${days}` : "";
  const payload = await http<unknown>(`/api/dashboard${qs}`);
  return unwrap<DashboardData>(payload);
}

/* ======================= Categories ======================= */
export interface Category {
  _id: string;
  name: string;
  order?: number;
}
function normalizeCategory(raw: unknown): Category {
  const r = isRecord(raw) ? raw : {};
  const id = (r._id ?? r.id) as unknown;
  return {
    _id: str(id),
    name: str(r.name),
    order: typeof r.order === "number" ? r.order : undefined,
  };
}
export async function getCategories(): Promise<Category[]> {
  const payload = await http<unknown>("/api/categories");
  const list = unwrapArray(payload);
  return list.map(normalizeCategory);
}
export async function addCategory(name: string): Promise<Category> {
  const created = await http<unknown>("/api/categories", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
  return normalizeCategory(unwrap<unknown>(created));
}
export async function updateCategory(
  id: string,
  updates: { name?: string; order?: number }
): Promise<Category> {
  const updated = await http<unknown>(`/api/categories/${id}`, {
    method: "PUT",
    body: JSON.stringify(updates),
  });
  return normalizeCategory(unwrap<unknown>(updated));
}
export async function deleteCategory(id: string): Promise<void> {
  await http<void>(`/api/categories/${id}`, { method: "DELETE" });
}
export async function reorderCategories(ids: string[]): Promise<void> {
  await http<void>("/api/categories/order", {
    method: "PUT",
    body: JSON.stringify({ ids }),
  });
}

/* ======================= Products ======================= */
export interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  stock: number;
  status: "active" | "inactive" | "draft";
  images: string[];
  eshopboxProductId?: string;
}
type ProductDTO = Omit<Product, "id" | "hoverImage"> & { _id: string };

function imageUrlFrom(x: unknown): string | undefined {
  if (isRecord(x) && typeof x.url === "string" && x.url) return x.url;
  return undefined;
}
function readImages(raw: unknown): string[] {
  const arr = Array.isArray(raw) ? raw : [];
  return arr.map((x) => imageUrlFrom(x) ?? str(x));
}
function readHoverUrl(rawHover: unknown, rawHoverImage: unknown): string | undefined {
  const fromObj = imageUrlFrom(rawHover);
  if (fromObj) return fromObj;
  if (typeof rawHoverImage === "string" && rawHoverImage) return rawHoverImage;
  return undefined;
}
function productFromUnknown(raw: unknown): Product {
  const r = isRecord(raw) ? raw : {};
  const _id = (r._id ?? r.id) as unknown;
  const images = readImages(r.images);
  const statusVal = str(r.status);
  const status: Product["status"] =
    statusVal === "inactive" || statusVal === "draft" ? statusVal : "active";
  const hoverImage = readHoverUrl(r.hover, r.hoverImage);
  return {
    id: str(_id),
    name: str(r.name),
    price: num(r.price),
    category: isRecord(r.category) ? str((r.category as Record<string, unknown>)._id ?? (r.category as Record<string, unknown>).id) : str(r.category),
    stock: num(r.stock),
    status,
    images,
    ...(hoverImage ? { hoverImage } : {}),
    eshopboxProductId: optStr(r, "eshopboxProductId"),
  };
}
function toProductDTO(p: Partial<Omit<Product, "id" | "hoverImage">>): Partial<ProductDTO> {
  return p as Partial<ProductDTO>;
}
export async function fetchProducts(): Promise<Product[]> {
  const payload = await http<unknown>("/api/products");
  const list = unwrapArray(payload);
  return list.map(productFromUnknown);
}
export async function addProduct(product: Omit<Product, "id">): Promise<Product> {
  const created = await http<unknown>("/api/products", {
    method: "POST",
    body: JSON.stringify(toProductDTO(product)),
  });
  return productFromUnknown(unwrap<unknown>(created));
}
export async function updateProduct(
  id: string,
  updates: Partial<Omit<Product, "id">>
): Promise<Product> {
  const updated = await http<unknown>(`/api/products/${id}`, {
    method: "PUT",
    body: JSON.stringify(toProductDTO(updates)),
  });
  return productFromUnknown(unwrap<unknown>(updated));
}
export async function deleteProduct(id: string): Promise<void> {
  await http<void>(`/api/products/${id}`, { method: "DELETE" });
}
export async function getProduct(id: string): Promise<Product> {
  const payload = await http<unknown>(`/api/products/${id}`);
  return productFromUnknown(unwrap<unknown>(payload));
}

/* ======================= Inventory ======================= */
export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  stock: number;
  price: number;
  minStockLevel: number;
}
export async function fetchInventory(): Promise<InventoryItem[]> {
  const payload = await http<unknown>("/api/inventory");
  const list = unwrapArray(payload);
  return list.map((raw) => {
    const r = isRecord(raw) ? raw : {};
    const id = (r._id ?? r.id) as unknown;
    return {
      id: str(id),
      name: str(r.name),
      category: str(r.category),
      stock: num(r.stock),
      price: num(r.price),
      minStockLevel: num(r.minStockLevel),
    };
  });
}

/* ======================= Admin Orders (new) ======================= */
export type OrderStatus = "pending" | "paid" | "failed" | "cancelled";

/* ---- Shipment types (admin) ---- */
export type ShipmentStatus = "created" | "label_generated" | "cancelled" | "error" | string; // Allow any string for Eshopbox statuses
export interface ShipmentRecord {
  courierName?: string;
  trackingId?: string;
  label_url?: string; // normalized key (camel or snake accepted)
  labelUrl?: string; // camelCase variant
  shipmentId?: string;
  routingCode?: string;
  shippingMode?: string;
  gstin?: string;
  transporterID?: string;
  status?: ShipmentStatus;
  latest_status?: string;
  status_updated_at?: string;
  statusDescription?: string;
  statusCategory?: "pending" | "in-transit" | "delivered" | "issue";
  eshopboxShipmentId?: string;
  isCOD?: boolean;
  invoiceTotal?: number;
  createdAt?: string;
  updatedAt?: string;
}
function normalizeShipment(raw: unknown): ShipmentRecord {
  const r = isRecord(raw) ? raw : {};
  const s = str(r.status);

  // Accept both snake and camel from backend
  const labelSnake = optStr(r, "label_url");
  const labelCamel = optStr(r, "labelUrl");

  return {
    courierName: optStr(r, "courierName"),
    trackingId: optStr(r, "trackingId"),
    label_url: labelSnake || labelCamel,
    labelUrl: labelSnake || labelCamel,
    shipmentId: optStr(r, "shipmentId"),
    routingCode: optStr(r, "routingCode"),
    shippingMode: optStr(r, "shippingMode"),
    gstin: optStr(r, "gstin"),
    transporterID: optStr(r, "transporterID"),
    status: s || undefined,
    latest_status: optStr(r, "latest_status"),
    status_updated_at: optStr(r, "status_updated_at"),
    statusDescription: optStr(r, "statusDescription"),
    statusCategory: hasKey(r, "statusCategory") && typeof r.statusCategory === "string"
      ? (r.statusCategory as "pending" | "in-transit" | "delivered" | "issue")
      : undefined,
    eshopboxShipmentId: optStr(r, "eshopboxShipmentId"),
    isCOD: bool(r.isCOD),
    invoiceTotal: typeof r.invoiceTotal === "number" ? r.invoiceTotal : undefined,
    createdAt: optStr(r, "createdAt"),
    updatedAt: optStr(r, "updatedAt"),
  };
}

export interface AdminOrderListItem {
  id: string;                 // _id
  orderNumber: string;        // WNR_0004
  totalAmount: number;        // total
  status: OrderStatus;        // pending|paid|failed|cancelled
  dateISO: string | null;     // placedAt || createdAt
  customerName: string | null;
  customerPhone: string | null;
  paymentMethod: "razorpay" | "cod" | null;
  deliverySpeed?: "standard" | "express" | "prime"; // Delivery speed option
  hasShipment?: boolean;
  shipment?: ShipmentRecord | null;
}

export interface AdminOrderDetail {
  id: string;
  orderNumber: string;
  user: string;
  subtotal: number;
  shipping: number;
  total: number;
  status: OrderStatus;
  deliverySpeed?: "standard" | "express" | "prime"; // Delivery speed option
  coupon?: {
    code: string;
    name: string;
    discountType: "percentage" | "fixed";
    discountValue: number;
    discountAmount: number;
  } | null;
  payment?: {
    method?: "razorpay" | "cod";
    status?: "unpaid" | "paid" | "failed";
    razorpayOrderId?: string;
    razorpayPaymentId?: string;
  } | null;
  addressSnapshot?: {
    name?: string | null;
    phone?: string | null;
    line1: string;
    line2?: string | null;
    city: string;
    state: string;
    pincode: string;
  } | null;
  items: {
    product?: string;         // product id
    name: string;
    price: number;
    qty: number;
    imageUrl?: string;
  }[];
  placedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  shipment?: ShipmentRecord | null;
}

export async function fetchAdminOrders(params?: {
  page?: number;
  pageSize?: number;
  q?: string;
  status?: OrderStatus;
  from?: string; // ISO
  to?: string;   // ISO
}): Promise<{ items: AdminOrderListItem[]; total: number; page: number; pageSize: number; totalPages: number }> {
  const qs = new URLSearchParams();
  if (params?.page) qs.set("page", String(params.page));
  if (params?.pageSize) qs.set("pageSize", String(params.pageSize));
  if (params?.q) qs.set("q", params.q);
  if (params?.status) qs.set("status", params.status);
  if (params?.from) qs.set("from", params.from);
  if (params?.to) qs.set("to", params.to);

  const payload = await http<unknown>(`/api/admin/orders${qs.toString() ? `?${qs}` : ""}`);
  const data = unwrap<unknown>(payload);

  let items: AdminOrderListItem[] = [];
  if (isRecord(data) && Array.isArray(data.items)) {
    items = data.items.map((raw: unknown) => {
      const r = isRecord(raw) ? raw : {};
      const statusStr = str(r.status);
      const status: OrderStatus =
        statusStr === "pending" || statusStr === "paid" || statusStr === "failed" || statusStr === "cancelled"
          ? statusStr
          : "pending";
      const dateISO =
        typeof r.placedAt === "string"
          ? r.placedAt
          : typeof r.createdAt === "string"
            ? r.createdAt
            : null;

      const shipment: ShipmentRecord | null = isRecord(r.shipment) ? normalizeShipment(r.shipment) : null;

      const deliverySpeed = hasKey(r, "deliverySpeed") && 
        (r.deliverySpeed === "standard" || r.deliverySpeed === "express" || r.deliverySpeed === "prime")
        ? r.deliverySpeed as "standard" | "express" | "prime"
        : undefined;

      return {
        id: str(r._id ?? r.id),
        orderNumber: str(r.orderNumber),
        totalAmount: num(r.total),
        status,
        dateISO,
        customerName: hasKey(r, "customerName") ? (r.customerName as string | null) : null,
        customerPhone: hasKey(r, "customerPhone") ? (r.customerPhone as string | null) : null,
        paymentMethod: hasKey(r, "paymentMethod") ? (r.paymentMethod as "razorpay" | "cod" | null) : null,
        deliverySpeed,
        hasShipment: typeof r.hasShipment === "boolean" ? r.hasShipment : (shipment ? true : undefined),
        shipment,
      };
    });
  }

  const total = isRecord(data) ? num(data.total) : items.length;
  const page = isRecord(data) ? num(data.page) || 1 : 1;
  const pageSize = isRecord(data) ? num(data.pageSize) || items.length : items.length || 0;
  const totalPages =
    isRecord(data) && typeof data.totalPages !== "undefined"
      ? num(data.totalPages)
      : Math.max(1, Math.ceil(total / Math.max(1, pageSize)));

  return { items, total, page, pageSize, totalPages };
}

export async function fetchAdminOrderById(id: string): Promise<AdminOrderDetail> {
  const payload = await http<unknown>(`/api/admin/orders/${encodeURIComponent(id)}`);
  const maybeEnvelope = unwrap<unknown>(payload);
  const o = isRecord(maybeEnvelope) && hasKey(maybeEnvelope, "item")
    ? (maybeEnvelope.item as unknown)
    : maybeEnvelope;

  const r = isRecord(o) ? o : {};
  const itemsArr = Array.isArray(r.items) ? r.items : [];

  const items = itemsArr.map((it) => {
    const x = isRecord(it) ? it : {};
    return {
      product: hasKey(x, "product") ? str(x.product) : undefined,
      name: str(x.name),
      price: num(x.price),
      qty: num(x.qty),
      imageUrl: optStr(x, "imageUrl"),
    };
  });

  const addr = isRecord(r.addressSnapshot) ? r.addressSnapshot : null;
  const pay = isRecord(r.payment) ? r.payment : null;

  const statusStr = str(r.status);
  const status: OrderStatus =
    statusStr === "pending" || statusStr === "paid" || statusStr === "failed" || statusStr === "cancelled"
      ? statusStr
      : "pending";

  const shipment: ShipmentRecord | null = isRecord(r.shipment) ? normalizeShipment(r.shipment) : null;

  const deliverySpeed = hasKey(r, "deliverySpeed") && 
    (r.deliverySpeed === "standard" || r.deliverySpeed === "express" || r.deliverySpeed === "prime")
    ? r.deliverySpeed as "standard" | "express" | "prime"
    : undefined;

  return {
    id: str(r._id ?? r.id),
    orderNumber: str(r.orderNumber),
    user: str(r.user),
    subtotal: num(r.subtotal),
    shipping: num(r.shipping),
    total: num(r.total),
    status,
    deliverySpeed,
    payment: pay
      ? {
        method: typeof pay.method === "string" ? (pay.method as "razorpay" | "cod") : undefined,
        status: typeof pay.status === "string" ? (pay.status as "unpaid" | "paid" | "failed") : undefined,
        razorpayOrderId: typeof (pay as Record<string, unknown>).razorpayOrderId === "string"
          ? (pay as Record<string, unknown>).razorpayOrderId as string
          : undefined,
        razorpayPaymentId: typeof (pay as Record<string, unknown>).razorpayPaymentId === "string"
          ? (pay as Record<string, unknown>).razorpayPaymentId as string
          : undefined,
      }
      : null,
    addressSnapshot: addr
      ? {
        name: optStrNull(addr, "name") ?? null,
        phone: optStrNull(addr, "phone") ?? null,
        line1: str(addr.line1),
        line2: hasKey(addr, "line2") ? (addr.line2 ? str(addr.line2) : null) : null,
        city: str(addr.city),
        state: str(addr.state),
        pincode: str(addr.pincode),
      }
      : null,
    items,
    placedAt: typeof r.placedAt === "string" ? r.placedAt : null,
    createdAt: typeof r.createdAt === "string" ? r.createdAt : null,
    updatedAt: typeof r.updatedAt === "string" ? r.updatedAt : null,
    shipment,
  };
}

/** Optional: if you add a PUT /api/admin/orders/:id on backend */
export async function updateAdminOrder(
  id: string,
  updates: Partial<{
    status: OrderStatus;
    courier: string;
    trackingNumber: string;
  }>
): Promise<AdminOrderDetail> {
  const payload = await http<unknown>(`/api/admin/orders/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(updates),
  });
  const out = unwrap<unknown>(payload);
  let updatedId: string = id;

  if (isRecord(out)) {
    if (hasKey(out, "item") && isRecord(out.item)) {
      updatedId = str(out.item._id ?? out.item.id ?? id);
    } else {
      updatedId = str(out._id ?? out.id ?? id);
    }
  }

  return fetchAdminOrderById(updatedId);
}

/* ========= Admin Shipping (NEW) =========
   POST /api/admin/shipping/:id/create
   GET  /api/admin/shipping/:id
========================================= */

export async function createAdminShipment(
  orderId: string
): Promise<{ ok: boolean; shipment: ShipmentRecord }> {
  const payload = await http<unknown>(`/api/admin/shipping/${encodeURIComponent(orderId)}/create`, {
    method: "POST",
  });
  const data = unwrap<unknown>(payload);

  let ok = true;
  let shipmentRaw: unknown = data;

  if (isRecord(data)) {
    if (typeof data.ok === "boolean") ok = data.ok;
    shipmentRaw = hasKey(data, "shipment") ? data.shipment : data;
  }

  return { ok, shipment: normalizeShipment(shipmentRaw) };
}

export async function fetchAdminShipment(orderId: string): Promise<ShipmentRecord | null> {
  const payload = await http<unknown>(`/api/admin/shipping/${encodeURIComponent(orderId)}`, {
    method: "GET",
  });
  const data = unwrap<unknown>(payload);
  const s = isRecord(data) && hasKey(data, "shipment") ? data.shipment : data;
  return isRecord(s) ? normalizeShipment(s) : null;
}

export async function refreshOrderTracking(orderId: string): Promise<{ ok: boolean; shipment?: ShipmentRecord }> {
  const payload = await http<unknown>(`/api/admin/orders/${encodeURIComponent(orderId)}/refresh-tracking`, {
    method: "POST",
  });
  const data = unwrap<unknown>(payload);
  
  if (isRecord(data)) {
    const shipmentRaw = hasKey(data, "shipment") ? data.shipment : undefined;
    return {
      ok: data.ok === true,
      shipment: shipmentRaw && isRecord(shipmentRaw) ? normalizeShipment(shipmentRaw) : undefined,
    };
  }
  
  return { ok: false };
}

/* ======================= User-scoped Orders (existing) ======================= */
export interface OrderListItem {
  id: string;                 // _id
  orderNumber: string;        // e.g., WNR_0004
  totalAmount: number;        // total
  status: OrderStatus;        // "pending" | "paid" | "failed" | "cancelled"
  dateISO: string | null;     // placedAt || createdAt
  customerName?: string | null;
  paymentMethod?: "razorpay" | "cod" | null;
}
export interface OrderDetailItem {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  totalAmount: number;
  subtotal: number;
  shipping: number;
  dateISO: string | null;
  paymentMethod?: "razorpay" | "cod" | null;
  items: { productId?: string; productName: string; quantity: number; price: number }[];
  shippingAddress?: {
    name?: string | null;
    phone?: string | null;
    line1: string;
    line2?: string | null;
    city: string;
    state: string;
    pincode: string;
  };
}
export async function fetchOrders(): Promise<OrderListItem[]> {
  const payload = await http<unknown>("/api/orders");
  const list = unwrapArray(payload);
  return list.map((o) => {
    const r = isRecord(o) ? o : {};
    const statusStr = str(r.status);
    const status: OrderStatus =
      statusStr === "pending" || statusStr === "paid" || statusStr === "failed" || statusStr === "cancelled"
        ? statusStr
        : "pending";
    const dateISO =
      typeof r.placedAt === "string"
        ? r.placedAt
        : typeof r.createdAt === "string"
          ? r.createdAt
          : null;

    return {
      id: str(r._id ?? r.id),
      orderNumber: str(r.orderNumber),
      totalAmount: num(r.total),
      status,
      dateISO,
      customerName: hasKey(r, "customerName") ? (r.customerName as string | null) : undefined,
      paymentMethod: hasKey(r, "paymentMethod") ? (r.paymentMethod as "razorpay" | "cod" | null) : undefined,
    };
  });
}
export async function fetchOrderById(id: string): Promise<OrderDetailItem> {
  const o = unwrap<unknown>(await http<unknown>(`/api/orders/${encodeURIComponent(id)}`));
  const r = isRecord(o) ? o : {};

  const itemsArr = Array.isArray(r.items) ? r.items : [];
  const items = itemsArr.map((it) => {
    const x = isRecord(it) ? it : {};
    return {
      productId: hasKey(x, "product") ? str(x.product) : undefined,
      productName: str(x.name),
      quantity: num(x.qty),
      price: num(x.price),
    };
  });

  const addr = isRecord(r.addressSnapshot) ? r.addressSnapshot : undefined;

  const statusStr = str(r.status);
  const status: OrderStatus =
    statusStr === "pending" || statusStr === "paid" || statusStr === "failed" || statusStr === "cancelled"
      ? statusStr
      : "pending";

  const dateISO =
    typeof r.placedAt === "string"
      ? r.placedAt
      : typeof r.createdAt === "string"
        ? r.createdAt
        : null;

  return {
    id: str(r._id ?? r.id),
    orderNumber: str(r.orderNumber),
    status,
    totalAmount: num(r.total),
    subtotal: num(r.subtotal),
    shipping: num(r.shipping),
    dateISO,
    paymentMethod:
      isRecord(r.payment) && typeof (r.payment as Record<string, unknown>).method === "string"
        ? ((r.payment as Record<string, unknown>).method as "razorpay" | "cod")
        : undefined,
    items,
    shippingAddress: addr
      ? {
        name: optStrNull(addr, "name") ?? null,
        phone: optStrNull(addr, "phone") ?? null,
        line1: str(addr.line1),
        line2: hasKey(addr, "line2") ? (addr.line2 ? str(addr.line2) : undefined) : undefined,
        city: str(addr.city),
        state: str(addr.state),
        pincode: str(addr.pincode),
      }
      : undefined,
  };
}
export async function updateOrder(
  orderId: string,
  updates: Partial<{
    status: OrderStatus;
    courier: string;
    trackingNumber: string;
  }>
): Promise<OrderDetailItem> {
  const payload = await http<unknown>(`/api/orders/${encodeURIComponent(orderId)}`, {
    method: "PUT",
    body: JSON.stringify(updates),
  });
  const updated = unwrap<unknown>(payload);
  let idOut = orderId;

  if (isRecord(updated)) {
    idOut = str(updated._id ?? updated.id ?? orderId);
  }

  return fetchOrderById(String(idOut));
}

/* ======================= Sales ======================= */
export interface SalesData {
  totalRevenue: number;
  totalOrders: number;
  totalRefunds: number;
  averageOrderValue: number;
  monthlyTrend: { labels: string[]; data: number[] };
}
export async function fetchSalesData(): Promise<SalesData> {
  const payload = await http<unknown>("/api/sales");
  return unwrap<SalesData>(payload);
}

/* ======================= Transactions ======================= */
export interface Transaction {
  id: string;
  orderId: string;
  amount: number;
  status: "completed" | "pending" | "failed" | "refunded";
  paymentMethod: string;
  customerEmail: string;
  date: string;
}
function txnFromUnknown(raw: unknown): Transaction {
  const r = isRecord(raw) ? raw : {};
  const _id = (r._id ?? r.id) as unknown;
  const st = str(r.status);
  const status: Transaction["status"] =
    st === "completed" || st === "pending" || st === "failed" || st === "refunded"
      ? st
      : "pending";
  return {
    id: str(_id),
    orderId: str(r.orderId),
    amount: num(r.amount),
    status,
    paymentMethod: str(r.paymentMethod),
    customerEmail: str(r.customerEmail),
    date: str(r.date),
  };
}
export async function fetchTransactions(): Promise<Transaction[]> {
  const payload = await http<unknown>("/api/transactions");
  const list = unwrapArray(payload);
  return list.map(txnFromUnknown);
}

/* ======================= Blogs ======================= */
export interface Blog {
  id: string;
  title: string;
  author: string;
  content: string;
  excerpt: string;
  featuredImage?: string;
  tags: string[];
  status: "published" | "draft";
  showOnWebpage?: boolean;
  createdAt: string;
  updatedAt: string;
}
function blogFromUnknown(raw: unknown): Blog {
  const r = isRecord(raw) ? raw : {};
  const _id = (r._id ?? r.id) as unknown;
  const tags = Array.isArray(r.tags) ? (r.tags as unknown[]).map(str) : [];
  const st = str(r.status);
  const status: Blog["status"] = st === "published" || st === "draft" ? st : "draft";
  return {
    id: str(_id),
    title: str(r.title),
    author: str(r.author),
    content: str(r.content),
    excerpt: str(r.excerpt),
    featuredImage: optStr(r, "featuredImage"),
    tags,
    status,
    showOnWebpage: bool(r.showOnWebpage) ?? false,
    createdAt: str(r.createdAt),
    updatedAt: str(r.updatedAt),
  };
}
export async function fetchBlogs(params?: {
  page?: number;
  limit?: number;
  q?: string;
  status?: "published" | "draft";
  tag?: string;
}): Promise<Blog[]> {
  const qs = new URLSearchParams();
  if (params?.page) qs.set("page", String(params.page));
  if (params?.limit) qs.set("limit", String(params.limit));
  if (params?.q) qs.set("q", params.q);
  if (params?.status) qs.set("status", params.status);
  if (params?.tag) qs.set("tag", params.tag);
  const payload = await http<unknown>(`/api/blogs${qs.toString() ? `?${qs}` : ""}`);
  const list = unwrapArray(payload);
  return list.map(blogFromUnknown);
}
export async function addBlog(
  blog: Omit<Blog, "id" | "createdAt" | "updatedAt">
): Promise<Blog> {
  const featuredImage =
    typeof blog.featuredImage === "string" && blog.featuredImage.trim() === "" ? undefined : blog.featuredImage;
  const payload = cleanse({
    title: blog.title,
    author: blog.author,
    content: blog.content,
    excerpt: blog.excerpt,
    tags: Array.isArray(blog.tags) ? blog.tags : [],
    status: blog.status ?? "draft",
    featuredImage,
    showOnWebpage: blog.showOnWebpage ?? false,
  });
  const created = await http<unknown>("/api/blogs", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return blogFromUnknown(unwrap<unknown>(created));
}
export async function updateBlog(
  id: string,
  updates: Partial<Omit<Blog, "id" | "createdAt">>
): Promise<Blog> {
  const maybeFeatured =
    typeof updates.featuredImage === "string" && updates.featuredImage.trim() === "" ? undefined : updates.featuredImage;
  const payload = cleanse({
    title: updates.title,
    author: updates.author,
    content: updates.content,
    excerpt: updates.excerpt,
    tags: updates.tags,
    status: updates.status,
    featuredImage: maybeFeatured,
    showOnWebpage: updates.showOnWebpage,
  });
  const updated = await http<unknown>(`/api/blogs/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  return blogFromUnknown(unwrap<unknown>(updated));
}
export async function deleteBlog(id: string): Promise<void> {
  await http<void>(`/api/blogs/${id}`, { method: "DELETE" });
}
export async function getBlog(idOrSlug: string): Promise<Blog> {
  const payload = await http<unknown>(`/api/blogs/${encodeURIComponent(idOrSlug)}`);
  return blogFromUnknown(unwrap<unknown>(payload));
}

/* ======================= Admin Users ======================= */
export interface AdminUser {
  _id: string;
  name: string;
  email: string;
  phone: string;
  role: "user" | "admin";
  lastLoginAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}
function adminUserFromUnknown(raw: unknown): AdminUser {
  const r = isRecord(raw) ? raw : {};
  const _id = (r._id ?? r.id) as unknown;
  return {
    _id: str(_id),
    name: str(r.name),
    email: str(r.email),
    phone: str(r.phone),
    role: str(r.role) === "admin" ? "admin" : "user",
    lastLoginAt: typeof r.lastLoginAt === "string" ? r.lastLoginAt : (r.lastLoginAt === null ? null : null),
    createdAt: typeof r.createdAt === "string" ? r.createdAt : (r.createdAt === null ? null : null),
    updatedAt: typeof r.updatedAt === "string" ? r.updatedAt : (r.updatedAt === null ? null : null),
  };
}
export async function fetchAdminUsers(): Promise<AdminUser[]> {
  const payload = await http<unknown>("/api/admin/users");
  const list = unwrapArray(payload);
  return list.map(adminUserFromUnknown);
}

/* ======================= Coupons ======================= */
export interface Coupon {
  _id: string;
  code: string;
  name: string;
  description?: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  minPurchaseAmount?: number;
  maxDiscountAmount?: number;
  validFrom: string;
  validUntil: string;
  usageLimit?: number;
  usageCount: number;
  userLimit?: number;
  isActive: boolean;
  applicableCategories?: string[];
  applicableProducts?: string[];
  excludeProducts?: string[];
  firstTimeUserOnly: boolean;
  createdAt: string;
  updatedAt: string;
}

export async function getCoupons(): Promise<Coupon[]> {
  const payload = await http<{ coupons: unknown[] }>("/api/coupons/admin");
  return unwrapArray(payload.coupons || []).map((c: unknown) => {
    const r = isRecord(c) ? c : {};
    return {
      _id: str(r._id ?? r.id),
      code: str(r.code),
      name: str(r.name),
      description: str(r.description),
      discountType: (str(r.discountType) as "percentage" | "fixed") || "fixed",
      discountValue: Number(r.discountValue) || 0,
      minPurchaseAmount: r.minPurchaseAmount ? Number(r.minPurchaseAmount) : undefined,
      maxDiscountAmount: r.maxDiscountAmount ? Number(r.maxDiscountAmount) : undefined,
      validFrom: str(r.validFrom),
      validUntil: str(r.validUntil),
      usageLimit: r.usageLimit ? Number(r.usageLimit) : undefined,
      usageCount: Number(r.usageCount) || 0,
      userLimit: r.userLimit ? Number(r.userLimit) : 1,
      isActive: Boolean(r.isActive),
      applicableCategories: Array.isArray(r.applicableCategories) ? r.applicableCategories.map(str) : [],
      applicableProducts: Array.isArray(r.applicableProducts) ? r.applicableProducts.map(str) : [],
      excludeProducts: Array.isArray(r.excludeProducts) ? r.excludeProducts.map(str) : [],
      firstTimeUserOnly: Boolean(r.firstTimeUserOnly),
      createdAt: str(r.createdAt),
      updatedAt: str(r.updatedAt),
    };
  });
}

export async function createCoupon(coupon: Omit<Coupon, "_id" | "createdAt" | "updatedAt" | "usageCount">): Promise<Coupon> {
  const created = await http<unknown>("/api/coupons/admin", {
    method: "POST",
    body: JSON.stringify(coupon),
  });
  const r = isRecord(created) && hasKey(created, "coupon") ? (created.coupon as unknown) : created;
  const c = isRecord(r) ? r : {};
  return {
    _id: str(c._id ?? c.id),
    code: str(c.code),
    name: str(c.name),
    description: str(c.description),
    discountType: (str(c.discountType) as "percentage" | "fixed") || "fixed",
    discountValue: Number(c.discountValue) || 0,
    minPurchaseAmount: c.minPurchaseAmount ? Number(c.minPurchaseAmount) : undefined,
    maxDiscountAmount: c.maxDiscountAmount ? Number(c.maxDiscountAmount) : undefined,
    validFrom: str(c.validFrom),
    validUntil: str(c.validUntil),
    usageLimit: c.usageLimit ? Number(c.usageLimit) : undefined,
    usageCount: Number(c.usageCount) || 0,
    userLimit: c.userLimit ? Number(c.userLimit) : 1,
    isActive: Boolean(c.isActive),
    applicableCategories: Array.isArray(c.applicableCategories) ? c.applicableCategories.map(str) : [],
    applicableProducts: Array.isArray(c.applicableProducts) ? c.applicableProducts.map(str) : [],
    excludeProducts: Array.isArray(c.excludeProducts) ? c.excludeProducts.map(str) : [],
    firstTimeUserOnly: Boolean(c.firstTimeUserOnly),
    createdAt: str(c.createdAt),
    updatedAt: str(c.updatedAt),
  };
}

export async function updateCoupon(id: string, updates: Partial<Coupon>): Promise<Coupon> {
  const updated = await http<unknown>(`/api/coupons/admin/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(updates),
  });
  const r = isRecord(updated) && hasKey(updated, "coupon") ? (updated.coupon as unknown) : updated;
  const c = isRecord(r) ? r : {};
  return {
    _id: str(c._id ?? c.id),
    code: str(c.code),
    name: str(c.name),
    description: str(c.description),
    discountType: (str(c.discountType) as "percentage" | "fixed") || "fixed",
    discountValue: Number(c.discountValue) || 0,
    minPurchaseAmount: c.minPurchaseAmount ? Number(c.minPurchaseAmount) : undefined,
    maxDiscountAmount: c.maxDiscountAmount ? Number(c.maxDiscountAmount) : undefined,
    validFrom: str(c.validFrom),
    validUntil: str(c.validUntil),
    usageLimit: c.usageLimit ? Number(c.usageLimit) : undefined,
    usageCount: Number(c.usageCount) || 0,
    userLimit: c.userLimit ? Number(c.userLimit) : 1,
    isActive: Boolean(c.isActive),
    applicableCategories: Array.isArray(c.applicableCategories) ? c.applicableCategories.map(str) : [],
    applicableProducts: Array.isArray(c.applicableProducts) ? c.applicableProducts.map(str) : [],
    excludeProducts: Array.isArray(c.excludeProducts) ? c.excludeProducts.map(str) : [],
    firstTimeUserOnly: Boolean(c.firstTimeUserOnly),
    createdAt: str(c.createdAt),
    updatedAt: str(c.updatedAt),
  };
}

export async function deleteCoupon(id: string): Promise<void> {
  await http<void>(`/api/coupons/admin/${encodeURIComponent(id)}`, { method: "DELETE" });
}

/* ======================= Helper ======================= */
/**
 * Prefer same-origin `/api` unless you explicitly set NEXT_PUBLIC_API_BASE.
 *
 * - Callers may pass either `/api/...` or just `/something`.
 * - When NEXT_PUBLIC_API_BASE is set, we never auto-prepend `/api`.
 * - When it's not set, we ensure a single `/api` prefix.
 */
export const buildUrl = (p: string) => {
  const path = p.startsWith("/") ? p : `/${p}`;
  const RAW = process.env.NEXT_PUBLIC_API_BASE || "";
  const BASE = RAW.replace(/\/+$/, "");

  // Explicit external base: trust the path as-is
  if (BASE) return `${BASE}${path}`;

  // Same-origin: avoid double `/api`
  if (path === "/api" || path.startsWith("/api/")) return path;
  return `/api${path}`;
};
