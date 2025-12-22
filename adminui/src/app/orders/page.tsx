// src/app/orders/page.tsx
"use client";

import React, { useEffect, useMemo, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  Eye,
  Download,
  X,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Package,
  Truck,
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
  FileText,
  Loader2
} from "lucide-react";
import {
  fetchAdminOrders,
  fetchAdminOrderById,
  getProduct,
  type AdminOrderListItem,
  type AdminOrderDetail,
  type OrderStatus,
} from "@/lib/api";
import { renderInvoicePDF } from "@/lib/invoice";
import { http } from "@/lib/api";

const PAGE_SIZE = 20;

/** Shipment bits we expect from the admin APIs */
type ShipmentStatus = "created" | "label_generated" | "cancelled" | "error" | string;
type ShipmentPreview = {
  status?: ShipmentStatus;
  courierName?: string | null;
  trackingId?: string | null;
  labelUrl?: string | null;
  label_url?: string | null;
  shipmentId?: string | null;
  latest_status?: string | null;
  status_updated_at?: string | null;
  statusDescription?: string | null;
  statusCategory?: "pending" | "in-transit" | "delivered" | "issue" | null;
};

type AdminOrderListItemWithShip = AdminOrderListItem & {
  hasShipment?: boolean;
  shipmentStatus?: ShipmentStatus;
  shipment?: ShipmentPreview;
};

type AdminOrderDetailWithShip = AdminOrderDetail & {
  shipment?: ShipmentPreview;
  email?: string;
};

/** ---- helpers to avoid `any` ---- */
function isObj(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null;
}
function getErrMsg(e: unknown, fallback = "Unexpected error"): string {
  if (e instanceof Error) return e.message;
  if (typeof e === "string") return e;
  try {
    return JSON.stringify(e);
  } catch {
    return fallback;
  }
}

/** Expected shape from /shipping/:id/create */
type CreateShipmentResp = {
  ok?: boolean;
  message?: string;
  error?: string;
  shipment?: {
    trackingId?: string | null;
    labelUrl?: string | null;
    status?: ShipmentStatus;
    courierName?: string | null;
  } | null;
};

function AdminOrdersPageContent() {
  const searchParams = useSearchParams();
  const [orders, setOrders] = useState<AdminOrderListItemWithShip[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState<Record<string, boolean>>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | OrderStatus>("all");

  // paging
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // modal state (detail fetch on demand)
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<AdminOrderDetailWithShip | null>(null);

  async function load(pageNo: number) {
    try {
      setLoading(true);
      const { items, total: t } = await fetchAdminOrders({
        page: pageNo,
        pageSize: PAGE_SIZE,
        q: searchTerm || undefined,
        status: statusFilter === "all" ? undefined : statusFilter,
      });

      // client-side filtering for eshopbox-specific view
      const eshopOnly = searchParams?.get("eshopbox") === "1";
      let finalItems = items as AdminOrderListItemWithShip[];
      if (eshopOnly) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const isEshop = (o: any) => !!(o.trackingId || o.shipmentId || o.labelUrl || o.courierName || o.eshopboxOrderId);
        finalItems = finalItems.filter(isEshop);
        setTotal(finalItems.length);
      } else {
        setTotal(t);
      }

      setOrders(finalItems);
    } catch (error) {
      console.error("Failed to fetch admin orders:", error);
      toast.error("Failed to fetch orders.");
    } finally {
      setLoading(false);
    }
  }

  // initial + when filters change
  useEffect(() => {
    setPage(1);
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, searchParams?.toString()]);

  // search debounce (basic)
  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      load(1);
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  // keyboard close for modal
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const filteredOrders = useMemo(() => orders, [orders]);

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case "pending":
        return "bg-amber-500/10 text-amber-600 border-amber-500/20";
      case "paid":
        return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
      case "failed":
        return "bg-rose-500/10 text-rose-600 border-rose-500/20";
      case "cancelled":
        return "bg-slate-500/10 text-slate-600 border-slate-500/20";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  const getStatusIcon = (status: OrderStatus) => {
    switch (status) {
      case "pending": return <Clock className="w-3.5 h-3.5" />;
      case "paid": return <CheckCircle2 className="w-3.5 h-3.5" />;
      case "failed": return <AlertCircle className="w-3.5 h-3.5" />;
      case "cancelled": return <XCircle className="w-3.5 h-3.5" />;
      default: return <Clock className="w-3.5 h-3.5" />;
    }
  };

  const formatDate = (iso: string | null) =>
    iso
      ? new Date(iso).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
      : "—";

  const openModal = async (summary: AdminOrderListItemWithShip) => {
    try {
      const detail = (await fetchAdminOrderById(summary.id)) as AdminOrderDetailWithShip;
      setSelected(detail);
      setOpen(true);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load order.");
    }
  };

  /** ------- Create shipment (minimal required payload) ------- */
  async function createShipment(orderId: string) {
    try {
      setCreating((m) => ({ ...m, [orderId]: true }));

      // 1) Load full order detail to build the minimal payload
      const detail = (await fetchAdminOrderById(orderId)) as AdminOrderDetail;

      if (detail.status !== "paid") {
        toast.error("Only PAID orders can be shipped.");
        return;
      }

      // 2) Resolve shipping address
      const addr = detail.addressSnapshot || {
        name: "Customer",
        line1: "",
        city: "",
        state: "",
        pincode: "",
      };

      // 3) Resolve item image URL and eshopboxProductId for each line:
      const items = await Promise.all(
        detail.items.map(async (it) => {
          let image =
            it.imageUrl && typeof it.imageUrl === "string" && it.imageUrl.trim()
              ? it.imageUrl
              : undefined;
          
          let eshopboxProductId: string | undefined = undefined;

          if (it.product) {
            try {
              const prod = await getProduct(it.product);
              // Use eshopboxProductId if available, otherwise fallback to product ObjectId
              eshopboxProductId = prod.eshopboxProductId || String(it.product);
              
              if (!image && Array.isArray(prod.images) && prod.images[0]) {
                // Handle both ImageInfo objects and string URLs
                const img = prod.images[0];
                image = typeof img === "string" ? img : (typeof img === "object" && img !== null && "url" in img ? String((img as { url?: unknown }).url) : String(img));
              }
            } catch {
              // ignore; fallback
            }
          }

          const fallbackImg = "https://via.placeholder.com/300.png?text=Item";

          return {
            itemID: eshopboxProductId || String(it.product || it.name || "SKU"),
            productTitle: String(it.name || "Item"),
            quantity: Number(it.qty || 1),
            itemTotal: Number((it.price || 0) * (it.qty || 1)),
            productImageUrl: image || fallbackImg,
          };
        })
      );

      // 4) Create unique shipmentId as requested
      const shipmentId = `SHIP_${detail.orderNumber}`.replace(/\s+/g, "_");

      // 5) Dimensions and pickup location from public env (Eshopbox expects numbers, not strings)
      const PICKUP_CODE = process.env.NEXT_PUBLIC_PICKUP_PINCODE || "380015";
      const PICKUP_CONTACT = process.env.NEXT_PUBLIC_PICKUP_CONTACT_NUMBER || process.env.NEXT_PUBLIC_PICKUP_CONTACT_PHONE || "";
      const PICKUP_ADDRESS_LINE1 = process.env.NEXT_PUBLIC_PICKUP_ADDRESS_LINE1 || "";
      const PICKUP_CITY = process.env.NEXT_PUBLIC_PICKUP_CITY || "";
      const PICKUP_STATE = process.env.NEXT_PUBLIC_PICKUP_STATE || "";
      const PICKUP_PINCODE = process.env.NEXT_PUBLIC_PICKUP_PINCODE || "";
      const L = parseFloat(process.env.NEXT_PUBLIC_PKG_LEN_CM || "12");
      const B = parseFloat(process.env.NEXT_PUBLIC_PKG_BRD_CM || "8");
      const H = parseFloat(process.env.NEXT_PUBLIC_PKG_HGT_CM || "9.5");
      const W = parseFloat(process.env.NEXT_PUBLIC_PKG_WT_G || "350");

      // 6) Minimal body (only required fields) - Eshopbox expects shipmentDimension object with numbers
      const body = {
        shipmentId, // required
        isCOD: (detail.payment?.method || "razorpay") === "cod", // required
        invoiceTotal: Number(detail.total), // required

        shippingAddress: {
          customerName: addr.name || "Customer",
          addressLine1: addr.line1 || "",
          addressLine2: addr.line2 || "",
          city: addr.city || "",
          state: addr.state || "",
          pincode: addr.pincode || "",
          country: "India",
          contactPhone: addr.phone || "",
          email: (typeof detail === "object" && detail !== null && "email" in detail ? String((detail as { email?: unknown }).email) : "") || "",
        },

        items, // required group

        // Eshopbox expects shipmentDimension as an object with numeric values
        shipmentDimension: {
          length: L, // number (cm)
          breadth: B, // number (cm)
          height: H, // number (cm)
          weight: W, // number (grams)
        },

        pickupLocation: {
          locationCode: PICKUP_CODE, // required
          ...(PICKUP_CONTACT ? { contactNumber: PICKUP_CONTACT } : {}), // required by Eshopbox
          ...(PICKUP_ADDRESS_LINE1 ? { addressLine1: PICKUP_ADDRESS_LINE1 } : {}), // required by Eshopbox
          ...(PICKUP_CITY ? { city: PICKUP_CITY } : {}), // required by Eshopbox
          ...(PICKUP_STATE ? { state: PICKUP_STATE } : {}), // required by Eshopbox
          ...(PICKUP_PINCODE ? { pincode: PICKUP_PINCODE } : {}), // required by Eshopbox
        },
      };

      // 7) Call your backend admin endpoint using the same http() helper as other APIs
      // This ensures it uses the correct API_BASE (same as fetchAdminOrders)
      const data = await http<CreateShipmentResp>(
        `/api/admin/shipping/${encodeURIComponent(orderId)}/create`,
        {
          method: "POST",
          body: JSON.stringify(body),
        }
      );

      // Handle response (http() already throws on !res.ok, so we're here means success)
      const response = isObj(data) ? (data as Partial<CreateShipmentResp>) : {};
      toast.success(
        response.shipment?.trackingId
          ? `Shipment created • ${response.shipment.trackingId}`
          : "Shipment created"
      );

      // refresh list
      await load(page);

      // refresh modal if open on same order
      if (open && selected?.id === orderId) {
        try {
          const fresh = (await fetchAdminOrderById(orderId)) as AdminOrderDetailWithShip;
          setSelected(fresh);
        } catch {
          // ignore
        }
      }
    } catch (e: unknown) {
      console.error("createShipment error:", e);
      toast.error(getErrMsg(e, "Failed to create shipment"));
    } finally {
      // remove the "creating" flag
      setCreating((prev) => {
        const copy = { ...prev };
        delete copy[orderId];
        return copy;
      });
    }
  }

  const totalOrders = total;
  const counts = useMemo(() => {
    const pageCounts = {
      pending: orders.filter((o) => o.status === "pending").length,
      paid: orders.filter((o) => o.status === "paid").length,
      failed: orders.filter((o) => o.status === "failed").length,
    };
    return pageCounts;
  }, [orders]);

  const goPrev = async () => {
    if (page <= 1 || loading) return;
    const next = page - 1;
    setPage(next);
    await load(next);
  };
  const goNext = async () => {
    if (page >= totalPages || loading) return;
    const next = page + 1;
    setPage(next);
    await load(next);
  };

  if (loading && orders.length === 0) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="flex justify-between items-center">
          <div className="h-8 w-48 bg-muted rounded-lg" />
          <div className="h-8 w-32 bg-muted rounded-lg" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-muted rounded-xl" />
          ))}
        </div>
        <div className="h-96 bg-muted rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Orders</h1>
          <p className="text-muted-foreground mt-1">Manage and track customer orders</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full border border-border/50">
          <span className="font-medium text-foreground">{totalOrders}</span> total orders
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard
          title="On this page"
          value={orders.length}
          icon={<FileText className="w-4 h-4" />}
        />
        <StatCard
          title="Pending"
          value={counts.pending}
          icon={<Clock className="w-4 h-4" />}
          color="amber"
        />
        <StatCard
          title="Paid"
          value={counts.paid}
          icon={<CheckCircle2 className="w-4 h-4" />}
          color="emerald"
        />
        <StatCard
          title="Failed"
          value={counts.failed}
          icon={<AlertCircle className="w-4 h-4" />}
          color="rose"
        />
      </div>

      {/* Filters & Controls */}
      <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-4 space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by name, phone, order no..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>
          <div className="w-full md:w-64 relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as "all" | OrderStatus)}
              className="w-full pl-9 pr-8 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer transition-all"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="failed">Failed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Order Details</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Customer</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Amount</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Shipment</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredOrders.map((order) => {
                const busy = !!creating[order.id];
                return (
                  <tr key={order.id} className="group hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-medium text-foreground">{order.orderNumber}</span>
                        <span className="text-xs text-muted-foreground mt-0.5">{formatDate(order.dateISO)}</span>
                        {order.deliverySpeed && (
                          <span className={`text-xs mt-1 px-2 py-0.5 rounded-full w-fit ${
                            order.deliverySpeed === "prime"
                              ? "bg-purple-100 text-purple-700"
                              : order.deliverySpeed === "express"
                              ? "bg-orange-100 text-orange-700"
                              : "bg-gray-100 text-gray-700"
                          }`}>
                            {order.deliverySpeed === "prime" ? "⚡ Prime" : order.deliverySpeed === "express" ? "🚀 Express" : "📦 Standard"}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-foreground">{order.customerName ?? "Guest"}</span>
                        <span className="text-xs text-muted-foreground">{order.customerPhone ?? "—"}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-medium text-foreground">{dcur(order.totalAmount)}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusBadge(order.status)}`}>
                        {getStatusIcon(order.status)}
                        <span className="capitalize">{order.status}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {order.shipment?.trackingId ? (
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5">
                            <Truck className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-xs font-medium text-emerald-600">
                              {order.shipment.courierName || "Shipped"}
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground font-mono">
                            {order.shipment.trackingId}
                          </span>
                          {order.shipment.status && (
                            <span className="text-xs text-muted-foreground capitalize">
                              {order.shipment.latest_status || order.shipment.status.replace(/_/g, " ").toLowerCase()}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 transition-opacity">
                        <button
                          onClick={() => openModal(order)}
                          className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() =>
                            fetchAdminOrderById(order.id)
                              .then((detail) => renderInvoicePDF(detail).catch(() => {}))
                              .catch(() => toast.error("Failed to load invoice"))
                          }
                          className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                          title="Download Invoice"
                        >
                          <Download className="w-4 h-4" />
                        </button>

                        {order.status === "paid" && !order.shipment?.trackingId && (
                          <button
                            onClick={() => createShipment(order.id)}
                            disabled={busy}
                            className="p-2 rounded-lg transition-colors text-primary bg-primary/10 hover:bg-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Create Shipment"
                          >
                            {busy ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Truck className="w-4 h-4" />
                            )}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredOrders.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Package className="w-12 h-12 mb-4 opacity-20" />
            <p>No orders found matching your criteria</p>
          </div>
        )}

        {/* Pagination */}
        <div className="px-6 py-4 border-t border-border flex items-center justify-between bg-muted/20">
          <p className="text-sm text-muted-foreground">
            Showing page <span className="font-medium text-foreground">{page}</span> of <span className="font-medium text-foreground">{totalPages}</span>
          </p>
          <div className="flex gap-2">
            <button
              onClick={goPrev}
              disabled={page <= 1 || loading}
              className="p-2 rounded-lg border border-border hover:bg-muted disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={goNext}
              disabled={page >= totalPages || loading}
              className="p-2 rounded-lg border border-border hover:bg-muted disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Order Detail Modal */}
      {open && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setOpen(false)}
          />
          <div className="relative w-full max-w-4xl bg-background rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-muted/30">
              <div>
                <h2 className="text-lg font-bold flex items-center gap-2">
                  Order #{selected.orderNumber}
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusBadge(selected.status)}`}>
                    {selected.status}
                  </span>
                  {selected.deliverySpeed && (
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      selected.deliverySpeed === "prime"
                        ? "bg-purple-100 text-purple-700"
                        : selected.deliverySpeed === "express"
                        ? "bg-orange-100 text-orange-700"
                        : "bg-gray-100 text-gray-700"
                    }`}>
                      {selected.deliverySpeed === "prime" ? "⚡ Prime" : selected.deliverySpeed === "express" ? "🚀 Express" : "📦 Standard"}
                    </span>
                  )}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Placed on {formatDate(selected.placedAt || selected.createdAt)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => renderInvoicePDF(selected).catch(() => toast.error("Failed to generate invoice"))}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-border text-sm font-medium hover:bg-muted transition-colors shadow-sm"
                >
                  <Download className="w-4 h-4" />
                  Invoice
                </button>
                <button
                  onClick={() => setOpen(false)}
                  className="p-2 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Info */}
                <div className="space-y-6">
                  <div className="bg-card border border-border rounded-xl p-4 space-y-3">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Customer</h3>
                    <div>
                      <p className="font-medium">{selected.addressSnapshot?.name ?? "Guest"}</p>
                      <p className="text-sm text-muted-foreground">{selected.addressSnapshot?.phone ?? "—"}</p>
                      <p className="text-sm text-muted-foreground mt-1">{selected.email}</p>
                    </div>
                  </div>

                  <div className="bg-card border border-border rounded-xl p-4 space-y-3">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Shipping</h3>
                    {selected.deliverySpeed && (
                      <div className="mb-3 pb-3 border-b border-border">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Delivery Speed:</span>
                          <span className={`text-sm font-semibold px-2 py-1 rounded-full ${
                            selected.deliverySpeed === "prime"
                              ? "bg-purple-100 text-purple-700"
                              : selected.deliverySpeed === "express"
                              ? "bg-orange-100 text-orange-700"
                              : "bg-gray-100 text-gray-700"
                          }`}>
                            {selected.deliverySpeed === "prime" ? "⚡ Prime" : selected.deliverySpeed === "express" ? "🚀 Express" : "📦 Standard"}
                          </span>
                        </div>
                      </div>
                    )}
                    <p className="text-sm leading-relaxed">
                      {formatAddressFromAdmin(selected.addressSnapshot)}
                    </p>
                  </div>

                  <div className="bg-card border border-border rounded-xl p-4 space-y-3">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Shipment Status</h3>
                    {selected.shipment?.trackingId ? (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Courier</span>
                          <span className="font-medium">{selected.shipment.courierName || "—"}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Tracking</span>
                          <span className="font-medium font-mono">{selected.shipment.trackingId}</span>
                        </div>
                        {selected.shipment.latest_status && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Status</span>
                            <span className="font-medium capitalize">
                              {selected.shipment.latest_status.replace(/_/g, " ").toLowerCase()}
                            </span>
                          </div>
                        )}
                        {(selected.shipment.labelUrl || selected.shipment.label_url) && (
                          <a
                            href={selected.shipment.labelUrl || selected.shipment.label_url || ""}
                            target="_blank"
                            rel="noreferrer"
                            className="block w-full text-center mt-2 px-3 py-2 bg-primary/10 text-primary rounded-lg text-sm font-medium hover:bg-primary/20 transition-colors"
                          >
                            Download Label
                          </a>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <p className="text-sm text-muted-foreground">No shipment created yet</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Column: Items */}
                <div className="lg:col-span-2 space-y-6">
                  <div className="bg-card border border-border rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50 border-b border-border">
                        <tr>
                          <th className="px-4 py-3 text-left font-medium text-muted-foreground">Item</th>
                          <th className="px-4 py-3 text-center font-medium text-muted-foreground">Qty</th>
                          <th className="px-4 py-3 text-right font-medium text-muted-foreground">Price</th>
                          <th className="px-4 py-3 text-right font-medium text-muted-foreground">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {selected.items.map((item, i) => (
                          <tr key={i}>
                            <td className="px-4 py-3 font-medium">{item.name}</td>
                            <td className="px-4 py-3 text-center text-muted-foreground">{item.qty}</td>
                            <td className="px-4 py-3 text-right text-muted-foreground">{dcur(item.price)}</td>
                            <td className="px-4 py-3 text-right font-medium">{dcur(item.price * item.qty)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-muted/20 border-t border-border">
                        <tr>
                          <td colSpan={3} className="px-4 py-2 text-right text-muted-foreground">Subtotal</td>
                          <td className="px-4 py-2 text-right font-medium">{dcur(selected.subtotal)}</td>
                        </tr>
                        <tr>
                          <td colSpan={3} className="px-4 py-2 text-right text-muted-foreground">Shipping</td>
                          <td className="px-4 py-2 text-right font-medium">{dcur(selected.shipping)}</td>
                        </tr>
                        <tr className="text-base">
                          <td colSpan={3} className="px-4 py-3 text-right font-bold">Total</td>
                          <td className="px-4 py-3 text-right font-bold text-primary">{dcur(selected.total)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* UI helpers */
function StatCard({
  title,
  value,
  icon,
  color = "primary",
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  color?: "primary" | "amber" | "emerald" | "rose";
}) {
  const colors = {
    primary: "bg-primary/10 text-primary",
    amber: "bg-amber-500/10 text-amber-600",
    emerald: "bg-emerald-500/10 text-emerald-600",
    rose: "bg-rose-500/10 text-rose-600",
  };

  return (
    <div className="bg-card border border-border rounded-xl p-5 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
      <div className={`p-3 rounded-lg ${colors[color]}`}>
        {icon}
      </div>
      <div>
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <p className="text-2xl font-bold tracking-tight">{value}</p>
      </div>
    </div>
  );
}

function dcur(n?: number) {
  if (typeof n !== "number") return "₹0";
  return `₹${n.toLocaleString()}`;
}

function formatAddressFromAdmin(a: AdminOrderDetail["addressSnapshot"]) {
  if (!a) return "—";
  const parts = [a.line1, a.line2, a.city, a.state, a.pincode].filter(Boolean);
  return parts.join(", ");
}

export default function AdminOrdersPage() {
  return (
    <Suspense fallback={
      <div className="space-y-6 animate-pulse">
        <div className="flex justify-between items-center">
          <div className="h-8 w-48 bg-muted rounded-lg" />
          <div className="h-8 w-32 bg-muted rounded-lg" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-muted rounded-xl" />
          ))}
        </div>
        <div className="h-96 bg-muted rounded-xl" />
      </div>
    }>
      <AdminOrdersPageContent />
    </Suspense>
  );
}
