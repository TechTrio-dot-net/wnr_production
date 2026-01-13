// ./src/app/shipping/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  fetchAdminOrders,
  refreshOrderTracking,
  type AdminOrderListItem,
} from "@/lib/api";
import {
  Truck,
  Package,
  CheckCircle2,
  Clock,
  AlertCircle,
  Search,
  Filter,
  Download,
  ExternalLink,
  TrendingUp,
  RefreshCw,
  Eye,
} from "lucide-react";
import TransitStepsModal from "@/components/order/TransitStepsModal";

type ShipmentStatusCategory = "pending" | "in-transit" | "delivered" | "issue";

// Helper function - matches backend computeStatusCategory logic from adminOrders.ts
function getStatusCategoryFromStatus(status: string): ShipmentStatusCategory {
  if (!status) return "pending";
  
  const normalized = String(status).toUpperCase().trim();
  
  // Delivered statuses - check for exact word "DELIVERED" (not part of "DELIVERY")
  // Also handle "SUCCESS" as delivered (common in some courier APIs)
  const isDelivered = 
    normalized === "DELIVERED" ||
    normalized === "DELIVERED_WAREHOUSE" ||
    normalized === "RTO_DELIVERED" ||
    normalized === "SUCCESS" || // SUCCESS typically means delivered
    normalized.startsWith("DELIVERED_") ||
    normalized.endsWith("_DELIVERED") ||
    (normalized.includes("DELIVERED") && !normalized.includes("DELIVERY")); // Has DELIVERED but not DELIVERY (like OUT_FOR_DELIVERY)
  
  if (isDelivered) {
    return "delivered";
  }
  
  // Issue statuses - check before transit to catch FAILED_DELIVERY
  if (
    normalized === "CANCELLED_ORDER" ||
    normalized === "PICKUP_FAILED" ||
    normalized === "LOST" ||
    normalized === "DAMAGED" ||
    normalized === "FAILED_DELIVERY" ||
    normalized === "RTO_FAILED" ||
    normalized === "SHIPMENT_HELD" ||
    normalized === "CONTACT_CUSTOMER_CARE" ||
    normalized === "RTO_CONTACT_CUSTOMER_CARE" ||
    normalized.includes("FAILED") ||
    normalized.includes("CANCELLED") ||
    normalized.includes("LOST") ||
    normalized.includes("DAMAGED") ||
    normalized.includes("HELD")
  ) {
    return "issue";
  }
  
  // In-transit statuses
  if (
    normalized === "PICKED_UP" ||
    normalized === "INTRANSIT" ||
    normalized === "OUT_FOR_DELIVERY" ||
    normalized === "RTO" ||
    normalized === "RTO_INTRANSIT" ||
    normalized === "RTO_OUT_FOR_DELIVERY" ||
    normalized.includes("TRANSIT") ||
    normalized.includes("PICKED") ||
    normalized.includes("OUT_FOR_DELIVERY")
  ) {
    return "in-transit";
  }
  
  // Everything else is pending
  return "pending";
}

export default function ShippingDashboard() {
  const [orders, setOrders] = useState<AdminOrderListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | ShipmentStatusCategory>("all");
  const [courierFilter, setCourierFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [refreshingOrders, setRefreshingOrders] = useState<Set<string>>(new Set());
  const [transitModalOpen, setTransitModalOpen] = useState(false);
  const [selectedTrackingId, setSelectedTrackingId] = useState<string | null>(null);
  const [selectedCurrentStatus, setSelectedCurrentStatus] = useState<string | null>(null);
  const PAGE_SIZE = 20;

  useEffect(() => {
    loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, statusFilter]);

  // Auto-refresh orders every 30 seconds to get webhook updates
  useEffect(() => {
    const interval = setInterval(() => {
      if (!loading) {
        loadOrders();
      }
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  async function loadOrders() {
    try {
      setLoading(true);
      const { items, total: t } = await fetchAdminOrders({
        page,
        pageSize: PAGE_SIZE,
        status: "paid", // Only show paid orders for shipping
      });
      // Don't compute and save statusCategory/statusDescription - compute dynamically in render
      setOrders(items);
      setTotal(t);
    } catch (error) {
      console.error("Failed to fetch orders:", error);
      toast.error("Failed to fetch orders.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRefreshTracking(orderId: string) {
    if (refreshingOrders.has(orderId)) return;
    
    setRefreshingOrders((prev) => new Set(prev).add(orderId));
    
    try {
      await refreshOrderTracking(orderId);
      toast.success("Tracking status refreshed");
      // Reload orders to get updated status
      await loadOrders();
    } catch (error: unknown) {
      console.error("Failed to refresh tracking:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to refresh tracking status";
      toast.error(errorMessage);
    } finally {
      setRefreshingOrders((prev) => {
        const next = new Set(prev);
        next.delete(orderId);
        return next;
      });
    }
  }

  // Filter orders with shipments
  const ordersWithShipments = useMemo(() => {
    return orders.filter((o) => o.shipment?.trackingId);
  }, [orders]);

  // Statistics - compute dynamically from current status
  const stats = useMemo(() => {
    const shipments = ordersWithShipments.map((o) => o.shipment!);
    
    const byCategory: Record<ShipmentStatusCategory, number> = {
      pending: 0,
      "in-transit": 0,
      delivered: 0,
      issue: 0,
    };

    shipments.forEach((s) => {
      // Always compute category dynamically from current status
      const currentStatus = s.latest_status || s.status || "";
      const category = getStatusCategoryFromStatus(currentStatus);
      byCategory[category]++;
    });

    const couriers = new Set(shipments.map((s) => s.courierName).filter(Boolean));
    
    return {
      total: shipments.length,
      pending: byCategory.pending,
      inTransit: byCategory["in-transit"],
      delivered: byCategory.delivered,
      issue: byCategory.issue,
      couriers: Array.from(couriers) as string[],
    };
  }, [ordersWithShipments]);

  // Filtered shipments
  const filteredShipments = useMemo(() => {
    let filtered = ordersWithShipments;

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (o) =>
          o.orderNumber.toLowerCase().includes(term) ||
          o.customerName?.toLowerCase().includes(term) ||
          o.shipment?.trackingId?.toLowerCase().includes(term) ||
          o.shipment?.courierName?.toLowerCase().includes(term)
      );
    }

    // Status filter - compute dynamically
    if (statusFilter !== "all") {
      filtered = filtered.filter((o) => {
        const currentStatus = o.shipment?.latest_status || o.shipment?.status || "";
        const category = getStatusCategoryFromStatus(currentStatus);
        return category === statusFilter;
      });
    }

    // Courier filter
    if (courierFilter !== "all") {
      filtered = filtered.filter((o) => o.shipment?.courierName === courierFilter);
    }

    return filtered;
  }, [ordersWithShipments, searchTerm, statusFilter, courierFilter]);

  const formatDate = (iso: string | null) =>
    iso
      ? new Date(iso).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : "—";

  const formatDateTime = (iso: string | null) =>
    iso
      ? new Date(iso).toLocaleString("en-IN", {
          day: "2-digit",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "—";

  const getStatusBadge = (category: ShipmentStatusCategory | undefined) => {
    switch (category) {
      case "pending":
        return "bg-amber-500/10 text-amber-600 border-amber-500/20";
      case "in-transit":
        return "bg-blue-500/10 text-blue-600 border-blue-500/20";
      case "delivered":
        return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
      case "issue":
        return "bg-rose-500/10 text-rose-600 border-rose-500/20";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  const getStatusIcon = (category: ShipmentStatusCategory | undefined) => {
    switch (category) {
      case "pending":
        return <Clock className="w-3.5 h-3.5" />;
      case "in-transit":
        return <Truck className="w-3.5 h-3.5" />;
      case "delivered":
        return <CheckCircle2 className="w-3.5 h-3.5" />;
      case "issue":
        return <AlertCircle className="w-3.5 h-3.5" />;
      default:
        return <Package className="w-3.5 h-3.5" />;
    }
  };


  const getProgressPercentage = (category: ShipmentStatusCategory | undefined): number => {
    switch (category) {
      case "pending":
        return 20;
      case "in-transit":
        return 60;
      case "delivered":
        return 100;
      case "issue":
        return 0;
      default:
        return 0;
    }
  };

  // Format status text for display
  const formatStatusText = (status: string | null | undefined): string => {
    if (!status) return "Status unknown";
    const normalized = String(status).toUpperCase().trim();
    
    // Map common statuses to readable text
    const statusMap: Record<string, string> = {
      "DELIVERED": "Delivered",
      "DELIVERED_WAREHOUSE": "Delivered to Warehouse",
      "RTO_DELIVERED": "Returned to Origin",
      "INTRANSIT": "In Transit",
      "PICKED_UP": "Picked Up",
      "OUT_FOR_DELIVERY": "Out for Delivery",
      "PICKUP_PENDING": "Awaiting Pickup",
      "PICKUP_FAILED": "Pickup Failed",
      "FAILED_DELIVERY": "Delivery Failed",
      "LOST": "Lost",
      "DAMAGED": "Damaged",
      "CANCELLED_ORDER": "Cancelled",
      "SHIPMENT_HELD": "Held",
      "RTO": "Returning to Origin",
      "RTO_INTRANSIT": "RTO In Transit",
      "RTO_OUT_FOR_DELIVERY": "RTO Out for Delivery",
      "PACKED": "Packed",
      "APPROVED": "Approved",
    };

    if (statusMap[normalized]) {
      return statusMap[normalized];
    }

    // Fallback: format the status string nicely
    return status
      .replace(/_/g, " ")
      .toLowerCase()
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  if (loading && orders.length === 0) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4" />
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-muted rounded-xl" />
            ))}
          </div>
          <div className="h-96 bg-muted rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Shipping Dashboard</h1>
          <p className="text-muted-foreground mt-1">Track and manage all shipments in real-time</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full border border-border/50">
          <Truck className="w-4 h-4" />
          <span className="font-medium text-foreground">{stats.total}</span> active shipments
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Total Shipments"
          value={stats.total}
          icon={<Package className="w-5 h-5" />}
          color="primary"
          trend={stats.total > 0 ? "+" + stats.total : "0"}
        />
        <StatCard
          title="In Transit"
          value={stats.inTransit}
          icon={<Truck className="w-5 h-5" />}
          color="blue"
          trend={`${stats.total > 0 ? Math.round((stats.inTransit / stats.total) * 100) : 0}%`}
        />
        <StatCard
          title="Delivered"
          value={stats.delivered}
          icon={<CheckCircle2 className="w-5 h-5" />}
          color="emerald"
          trend={`${stats.total > 0 ? Math.round((stats.delivered / stats.total) * 100) : 0}%`}
        />
        <StatCard
          title="Issues"
          value={stats.issue}
          icon={<AlertCircle className="w-5 h-5" />}
          color="rose"
          trend={stats.issue > 0 ? "Needs attention" : "All clear"}
        />
      </div>

      {/* Filters */}
      <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-4 space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by order number, tracking ID, customer, or courier..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>
          <div className="w-full md:w-48 relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as "all" | ShipmentStatusCategory)}
              className="w-full pl-9 pr-8 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer transition-all"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="in-transit">In Transit</option>
              <option value="delivered">Delivered</option>
              <option value="issue">Issues</option>
            </select>
          </div>
          {stats.couriers.length > 0 && (
            <div className="w-full md:w-48 relative">
              <Truck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <select
                value={courierFilter}
                onChange={(e) => setCourierFilter(e.target.value)}
                className="w-full pl-9 pr-8 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer transition-all"
              >
                <option value="all">All Couriers</option>
                {stats.couriers.map((courier) => (
                  <option key={courier} value={courier}>
                    {courier}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Shipments Table */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Order Details
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Courier & Tracking
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Progress
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredShipments.map((order) => {
                const shipment = order.shipment!;
                // Always compute status and progress dynamically from current status
                const currentStatus = shipment.latest_status || shipment.status || "";
                const category = getStatusCategoryFromStatus(currentStatus);
                const progress = getProgressPercentage(category);
                const statusDescription = formatStatusText(currentStatus);
                
                // Debug logging (can be removed in production)
                if (currentStatus && category === "pending" && !currentStatus.toLowerCase().includes("pending") && !currentStatus.toLowerCase().includes("packed")) {
                  console.log("Status categorization:", {
                    orderNumber: order.orderNumber,
                    currentStatus,
                    category,
                    latest_status: shipment.latest_status,
                    status: shipment.status,
                  });
                }

                return (
                  <tr key={order.id} className="group hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-medium text-foreground">{order.orderNumber}</span>
                        <span className="text-xs text-muted-foreground mt-0.5">
                          {formatDate(order.dateISO)}
                        </span>
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
                        <span className="text-sm font-medium text-foreground">
                          {order.customerName ?? "Guest"}
                        </span>
                        <span className="text-xs text-muted-foreground">{order.customerPhone ?? "—"}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5">
                          <Truck className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="text-sm font-medium text-foreground">
                            {shipment.courierName || "—"}
                          </span>
                        </div>
                        <span className="text-xs font-mono text-muted-foreground">
                          {shipment.trackingId}
                        </span>
                        {shipment.status_updated_at && (
                          <span className="text-xs text-muted-foreground">
                            Updated: {formatDateTime(shipment.status_updated_at)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1.5">
                        <div
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border w-fit ${getStatusBadge(
                            category
                          )}`}
                        >
                          {getStatusIcon(category)}
                          <span>
                            {category === "delivered"
                              ? "Delivered"
                              : category === "in-transit"
                              ? "In Transit"
                              : category === "issue"
                              ? "Issue"
                              : "Pending"}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {statusDescription || "Status unknown"}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-300 ${
                              category === "delivered"
                                ? "bg-emerald-500"
                                : category === "in-transit"
                                ? "bg-blue-500"
                                : category === "issue"
                                ? "bg-rose-500"
                                : "bg-amber-500"
                            }`}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-muted-foreground w-10 text-right">
                          {progress}%
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {shipment.trackingId && (
                          <button
                            onClick={() => {
                              setSelectedTrackingId(shipment.trackingId ?? null);
                              setSelectedCurrentStatus(currentStatus ?? null);
                              setTransitModalOpen(true);
                            }}
                            className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                            title="View Transit Steps"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        )}
                        {shipment.trackingId && (
                          <button
                            onClick={() => handleRefreshTracking(order.id)}
                            disabled={refreshingOrders.has(order.id)}
                            className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Refresh Tracking Status"
                          >
                            <RefreshCw 
                              className={`w-4 h-4 ${refreshingOrders.has(order.id) ? "animate-spin" : ""}`} 
                            />
                          </button>
                        )}
                        {(shipment.labelUrl || shipment.label_url) && (
                          <a
                            href={shipment.labelUrl || shipment.label_url || ""}
                            target="_blank"
                            rel="noreferrer"
                            className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                            title="Download Label"
                          >
                            <Download className="w-4 h-4" />
                          </a>
                        )}
                        {shipment.trackingId && (
                          <a
                            href={`https://www.google.com/search?q=${encodeURIComponent(
                              shipment.trackingId
                            )}`}
                            target="_blank"
                            rel="noreferrer"
                            className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                            title="Track Shipment"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredShipments.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Package className="w-12 h-12 mb-4 opacity-20" />
            <p className="text-sm">
              {searchTerm || statusFilter !== "all" || courierFilter !== "all"
                ? "No shipments found matching your criteria"
                : "No shipments available"}
            </p>
          </div>
        )}

        {/* Pagination */}
        {total > PAGE_SIZE && (
          <div className="px-6 py-4 border-t border-border flex items-center justify-between bg-muted/20">
            <p className="text-sm text-muted-foreground">
              Showing {filteredShipments.length} of {total} shipments
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || loading}
                className="p-2 rounded-lg border border-border hover:bg-muted disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
              >
                <span className="sr-only">Previous</span>
                ←
              </button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= Math.ceil(total / PAGE_SIZE) || loading}
                className="p-2 rounded-lg border border-border hover:bg-muted disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
              >
                <span className="sr-only">Next</span>
                →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Transit Steps Modal */}
      <TransitStepsModal
        isOpen={transitModalOpen}
        onClose={() => {
          setTransitModalOpen(false);
          setSelectedTrackingId(null);
          setSelectedCurrentStatus(null);
        }}
        trackingId={selectedTrackingId}
        currentStatus={selectedCurrentStatus || undefined}
      />
    </div>
  );
}

/* Stat Card Component */
function StatCard({
  title,
  value,
  icon,
  color = "primary",
  trend,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  color?: "primary" | "blue" | "emerald" | "rose" | "amber";
  trend?: string;
}) {
  const colors = {
    primary: "bg-primary/10 text-primary",
    blue: "bg-blue-500/10 text-blue-600",
    emerald: "bg-emerald-500/10 text-emerald-600",
    rose: "bg-rose-500/10 text-rose-600",
    amber: "bg-amber-500/10 text-amber-600",
  };

  return (
    <div className="bg-card border border-border rounded-xl p-5 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
      <div className={`p-3 rounded-lg ${colors[color]}`}>{icon}</div>
      <div className="flex-1">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <div className="flex items-baseline gap-2">
          <p className="text-2xl font-bold tracking-tight">{value}</p>
          {trend && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              {trend}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
