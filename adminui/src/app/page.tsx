// app/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import KPICard from "@/components/cards/KPICard";
import RevenueChart from "@/components/charts/RevenueChart";
import { fetchDashboardData, type DashboardData } from "@/lib/api";
import {
  ShoppingBag,
  Users,
  AlertTriangle,
  Calendar,
  Download,
  Filter,
  Package,
  TrendingUp,
  FileSpreadsheet,
} from "lucide-react";
import Link from "next/link";

const EMPTY: DashboardData = {
  totalSales: 0,
  totalOrders: 0,
  totalCustomers: 0,
  lowStockAlerts: 0,
  salesTrend: { labels: [], data: [] },
};

export default function Home() {
  const [data, setData] = useState<DashboardData>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState("7");
  const [err, setErr] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setErr(null);
        const days = Number(range) || 7;
        const res = await fetchDashboardData(days);
        setData({
          totalSales: Number(res?.totalSales ?? 0),
          totalOrders: Number(res?.totalOrders ?? 0),
          totalCustomers: Number(res?.totalCustomers ?? 0),
          lowStockAlerts: Number(res?.lowStockAlerts ?? 0),
          salesTrend: {
            labels: res?.salesTrend?.labels ?? [],
            data: res?.salesTrend?.data ?? [],
          },
          additionalMetrics: res?.additionalMetrics,
          recentOrders: res?.recentOrders,
          topProducts: res?.topProducts,
        });
      } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : typeof e === "object" && e !== null && "message" in e ? String((e as { message?: unknown }).message) : "Could not fetch dashboard data.";
        setErr(errorMessage);
      } finally {
        setLoading(false);
      }
    })();
  }, [range]);

  const chartData = useMemo(
    () => ({
      labels: data.salesTrend.labels,
      datasets: [
        {
          label: "Revenue",
          data: data.salesTrend.data,
        },
      ],
    }),
    [data.salesTrend]
  );

  const handleExport = async (format: "csv" | "json") => {
    try {
      setExporting(true);
      const days = Number(range) || 7;
      const exportData = await fetchDashboardData(days);

      if (format === "csv") {
        // Export to CSV
        const csvRows: string[] = [];
        
        // Header
        csvRows.push("Metric,Value");
        csvRows.push(`Total Sales,${exportData.totalSales}`);
        csvRows.push(`Total Orders,${exportData.totalOrders}`);
        csvRows.push(`Total Customers,${exportData.totalCustomers}`);
        csvRows.push(`Low Stock Alerts,${exportData.lowStockAlerts}`);
        
        if (exportData.additionalMetrics) {
          csvRows.push(`Paid Orders,${exportData.additionalMetrics.paidOrders}`);
          csvRows.push(`Pending Orders,${exportData.additionalMetrics.pendingOrders}`);
          csvRows.push(`Average Order Value,${exportData.additionalMetrics.averageOrderValue.toFixed(2)}`);
          csvRows.push(`Conversion Rate,${exportData.additionalMetrics.conversionRate.toFixed(2)}%`);
        }

        csvRows.push("");
        csvRows.push("Date,Revenue");
        exportData.salesTrend.labels.forEach((label, idx) => {
          csvRows.push(`${label},${exportData.salesTrend.data[idx] || 0}`);
        });

        if (exportData.topProducts && exportData.topProducts.length > 0) {
          csvRows.push("");
          csvRows.push("Product,Quantity Sold,Revenue");
          exportData.topProducts.forEach((p) => {
            csvRows.push(`${p.name},${p.quantity},${p.revenue}`);
          });
        }

        const csvContent = csvRows.join("\n");
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `dashboard-export-${new Date().toISOString().split("T")[0]}.csv`;
        link.click();
        URL.revokeObjectURL(url);
      } else {
        // Export to JSON
        const jsonContent = JSON.stringify(exportData, null, 2);
        const blob = new Blob([jsonContent], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `dashboard-export-${new Date().toISOString().split("T")[0]}.json`;
        link.click();
        URL.revokeObjectURL(url);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : typeof error === "object" && error !== null && "message" in error ? String((error as { message?: unknown }).message) : "Unknown error";
      alert(`Export failed: ${errorMessage}`);
    } finally {
      setExporting(false);
    }
  };

  const conversionRate = data.additionalMetrics?.conversionRate || 0;
  const avgOrderValue = data.additionalMetrics?.averageOrderValue || 0;

  if (!mounted) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="h-10 w-48 rounded-lg bg-muted/50" />
          <div className="h-10 w-32 rounded-lg bg-muted/50" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-40 rounded-2xl bg-muted/50" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-96 rounded-2xl bg-muted/50" />
          <div className="h-96 rounded-2xl bg-muted/50" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Dashboard Overview
          </h1>
          <p className="text-muted-foreground mt-1">
            Welcome back! Here&apos;s what&apos;s happening with your store.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <select
              value={range}
              onChange={(e) => setRange(e.target.value)}
              className="
                pl-9 pr-8 py-2.5 bg-card border border-border rounded-xl text-sm font-medium
                focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary
                shadow-sm transition-all appearance-none cursor-pointer
              "
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 3 months</option>
            </select>
            <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
          </div>

          <div className="relative group">
            <button
              disabled={exporting}
              className="p-2.5 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Export Dashboard Data"
            >
              <Download className="w-5 h-5" />
            </button>
            <div className="absolute right-0 top-full mt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all bg-card border border-border rounded-lg shadow-lg z-50 min-w-[140px]">
              <button
                onClick={() => handleExport("csv")}
                disabled={exporting}
                className="w-full text-left px-4 py-2 text-sm hover:bg-muted/50 flex items-center gap-2 rounded-t-lg"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Export CSV
              </button>
              <button
                onClick={() => handleExport("json")}
                disabled={exporting}
                className="w-full text-left px-4 py-2 text-sm hover:bg-muted/50 flex items-center gap-2 rounded-b-lg"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Export JSON
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Error */}
      {err && (
        <div className="bg-destructive/10 text-destructive border border-destructive/20 px-4 py-3 rounded-xl flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          {err}
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          title="Total Sales"
          value={`₹${data.totalSales.toLocaleString()}`}
          icon={<span className="text-lg font-bold">₹</span>}
          trend={
            data.additionalMetrics
              ? {
                  value: data.additionalMetrics.conversionRate > 0 ? 5 : 0,
                  isPositive: true,
                }
              : undefined
          }
          loading={loading}
          color="primary"
        />
        <KPICard
          title="Total Orders"
          value={data.totalOrders}
          icon={<ShoppingBag />}
          trend={
            data.additionalMetrics
              ? {
                  value: data.additionalMetrics.paidOrders > 0 ? 8 : 0,
                  isPositive: true,
                }
              : undefined
          }
          loading={loading}
          color="blue"
        />
        <KPICard
          title="Total Customers"
          value={data.totalCustomers}
          icon={<Users />}
          trend={
            data.totalCustomers > 0
              ? {
                  value: 5.7,
                  isPositive: true,
                }
              : undefined
          }
          loading={loading}
          color="green"
        />
        <KPICard
          title="Low Stock Alerts"
          value={data.lowStockAlerts}
          icon={<AlertTriangle />}
          trend={
            data.lowStockAlerts > 0
              ? {
                  value: 3.1,
                  isPositive: false,
                }
              : undefined
          }
          loading={loading}
          color="orange"
        />
      </div>

      {/* Charts + stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue chart - Takes up 2 columns */}
        <div className="lg:col-span-2 bg-card/50 backdrop-blur-sm shadow-sm rounded-2xl p-6 border border-border/50">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold">Revenue Trends</h2>
              <p className="text-sm text-muted-foreground">
                Revenue performance over the last {range} days
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-3 py-1 rounded-full">
              <span className="w-2 h-2 bg-primary rounded-full" />
              <span>Revenue</span>
            </div>
          </div>

          {loading ? (
            <div className="h-80 bg-muted/50 animate-pulse rounded-xl" />
          ) : data.salesTrend.labels.length ? (
            <div className="h-80 w-full">
              <RevenueChart data={chartData} />
            </div>
          ) : (
            <div className="h-80 flex flex-col items-center justify-center text-muted-foreground gap-2">
              <div className="p-4 rounded-full bg-muted/50">
                <Filter className="w-6 h-6 opacity-50" />
              </div>
              <p className="text-sm">No revenue data available</p>
            </div>
          )}
        </div>

        {/* Performance metrics - Takes up 1 column */}
        <div className="bg-card/50 backdrop-blur-sm shadow-sm rounded-2xl p-6 border border-border/50 flex flex-col">
          <h2 className="text-lg font-semibold mb-1">Store Performance</h2>
          <p className="text-sm text-muted-foreground mb-6">Key performance indicators</p>

          <div className="space-y-6 flex-1">
            <div className="group p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors border border-transparent hover:border-border/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-muted-foreground">Conversion Rate</span>
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    conversionRate > 0
                      ? "text-emerald-600 bg-emerald-500/10"
                      : "text-muted-foreground bg-muted"
                  }`}
                >
                  {loading ? "—" : `${conversionRate.toFixed(1)}%`}
                </span>
              </div>
              <div className="flex items-end justify-between">
                <span className="text-2xl font-bold">
                  {loading ? "—" : `${conversionRate.toFixed(1)}%`}
                </span>
                <div className="w-16 h-1 bg-emerald-500/20 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 transition-all"
                    style={{ width: `${Math.min(100, conversionRate * 10)}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="group p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors border border-transparent hover:border-border/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-muted-foreground">Avg. Order Value</span>
                <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                  {loading ? "—" : `₹${avgOrderValue.toFixed(0)}`}
                </span>
              </div>
              <div className="flex items-end justify-between">
                <span className="text-2xl font-bold">
                  {loading ? "—" : `₹${avgOrderValue.toLocaleString()}`}
                </span>
                <div className="w-16 h-1 bg-primary/20 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{
                      width: `${Math.min(100, (avgOrderValue / 5000) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="group p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors border border-transparent hover:border-border/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-muted-foreground">Paid Orders</span>
                <span className="text-xs font-semibold text-blue-600 bg-blue-500/10 px-2 py-0.5 rounded-full">
                  {loading
                    ? "—"
                    : `${data.additionalMetrics?.paidOrders || 0} / ${data.totalOrders}`}
                </span>
              </div>
              <div className="flex items-end justify-between">
                <span className="text-2xl font-bold">
                  {loading ? "—" : data.additionalMetrics?.paidOrders || 0}
                </span>
                <div className="w-16 h-1 bg-blue-500/20 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 transition-all"
                    style={{
                      width: `${
                        data.totalOrders > 0
                          ? ((data.additionalMetrics?.paidOrders || 0) / data.totalOrders) * 100
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          <Link
            href="/orders"
            className="w-full mt-6 py-2.5 text-sm font-medium text-primary bg-primary/5 hover:bg-primary/10 rounded-xl transition-colors text-center"
          >
            View All Orders
          </Link>
        </div>
      </div>

      {/* Recent Orders & Top Products */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <div className="bg-card/50 backdrop-blur-sm shadow-sm rounded-2xl p-6 border border-border/50">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold">Recent Orders</h2>
              <p className="text-sm text-muted-foreground">Latest orders from the selected period</p>
            </div>
            <Link
              href="/orders"
              className="text-sm text-primary hover:underline flex items-center gap-1"
            >
              View all
              <TrendingUp className="w-4 h-4" />
            </Link>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 bg-muted/50 animate-pulse rounded-lg" />
              ))}
            </div>
          ) : data.recentOrders && data.recentOrders.length > 0 ? (
            <div className="space-y-3">
              {data.recentOrders.map((order, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors border border-transparent hover:border-border/50"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{order.orderNumber}</span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          order.status === "paid"
                            ? "bg-emerald-500/10 text-emerald-600"
                            : order.status === "pending"
                              ? "bg-yellow-500/10 text-yellow-600"
                              : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {order.status}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{order.customerName}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">₹{order.total.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(order.date).toLocaleDateString("en-IN", {
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No recent orders</p>
            </div>
          )}
        </div>

        {/* Top Products */}
        <div className="bg-card/50 backdrop-blur-sm shadow-sm rounded-2xl p-6 border border-border/50">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold">Top Products</h2>
              <p className="text-sm text-muted-foreground">Best selling products by quantity</p>
            </div>
            <Link
              href="/products"
              className="text-sm text-primary hover:underline flex items-center gap-1"
            >
              View all
              <TrendingUp className="w-4 h-4" />
            </Link>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 bg-muted/50 animate-pulse rounded-lg" />
              ))}
            </div>
          ) : data.topProducts && data.topProducts.length > 0 ? (
            <div className="space-y-3">
              {data.topProducts.map((product, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors border border-transparent hover:border-border/50"
                >
                  <div className="flex-1">
                    <p className="font-medium text-sm mb-1 line-clamp-1">{product.name}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>Qty: {product.quantity}</span>
                      <span>•</span>
                      <span>Revenue: ₹{product.revenue.toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-xs font-bold text-primary">{idx + 1}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No product data available</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
