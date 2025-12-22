"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import RevenueChart from "@/components/charts/RevenueChart";
import { toast } from "sonner";
import { HiDownload, HiChevronDown } from "react-icons/hi";
import { fetchSalesData, fetchTransactions } from "@/lib/api";

interface SalesData {
  totalRevenue: number;
  totalOrders: number;
  totalRefunds: number;
  averageOrderValue: number;
  monthlyTrend: { labels: string[]; data: number[] };
}

interface Transaction {
  id: string;
  orderId: string;
  amount: number;
  status: "completed" | "pending" | "failed" | "refunded";
  paymentMethod: string;
  customerEmail: string;
  date: string;
}

export default function SalesPaymentsPage() {
  const [salesData, setSalesData] = useState<SalesData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState("30d");
  const [statusFilter, setStatusFilter] = useState("all");

  // export dropdown
  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const closeOnOutside = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setExportOpen(false);
      }
    };
    const closeOnEsc = (e: KeyboardEvent) => e.key === "Escape" && setExportOpen(false);

    document.addEventListener("mousedown", closeOnOutside);
    document.addEventListener("keydown", closeOnEsc);
    return () => {
      document.removeEventListener("mousedown", closeOnOutside);
      document.removeEventListener("keydown", closeOnEsc);
    };
  }, []);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [sales, txs] = await Promise.all([fetchSalesData(), fetchTransactions()]);
        setSalesData(sales);
        setTransactions(txs);
      } catch (error) {
        console.error("Failed to fetch data:", error);
        toast.error("Failed to fetch sales & transactions.");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const filteredTransactions = useMemo(
    () =>
      transactions.filter(
        (t) => statusFilter === "all" || t.status === statusFilter
      ),
    [transactions, statusFilter]
  );

  const chartData = useMemo(
    () => ({
      labels: salesData?.monthlyTrend.labels || [],
      datasets: [
        {
          label: "Monthly Revenue",
          // Let RevenueChart provide theme-aware styling; only pass data.
          data: salesData?.monthlyTrend.data || [],
        },
      ],
    }),
    [salesData]
  );

  const formatCurrency = (n: number) => `₹${(n ?? 0).toLocaleString()}`;
  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  const getStatusBadge = (status: Transaction["status"]) => {
    switch (status) {
      case "completed":
        return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20";
      case "pending":
        return "bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20";
      case "failed":
        return "bg-red-500/10 text-red-700 dark:text-red-300 border border-red-500/20";
      case "refunded":
        return "bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20";
      default:
        return "bg-muted text-muted-foreground border border-border";
    }
  };

  // --- Export helpers ---
  const csvEscape = (val: string | number) => {
    const s = String(val ?? "");
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };

  const exportCSV = (rows: Transaction[]) => {
    try {
      const header = [
        "Transaction ID",
        "Order ID",
        "Amount",
        "Status",
        "Payment Method",
        "Customer Email",
        "Date",
      ];
      const body = rows.map((r) => [
        r.id,
        r.orderId,
        r.amount,
        r.status,
        r.paymentMethod,
        r.customerEmail,
        formatDate(r.date),
      ]);

      const csv =
        [header, ...body]
          .map((row) => row.map(csvEscape).join(","))
          .join("\n") + "\n";

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      a.href = url;
      a.download = `transactions-${stamp}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("Exported CSV.");
    } catch (e) {
      console.error(e);
      toast.error("Failed to export CSV.");
    }
  };

  const exportPDF = async (rows: Transaction[]) => {
    try {
      const jsPDF = (await import("jspdf")).default;
      const autoTable = (await import("jspdf-autotable")).default;

      const doc = new jsPDF();
      const left = 14;

      doc.setFontSize(16);
      doc.text("Transactions", left, 16);
      doc.setFontSize(10);
      doc.text(
        `Generated: ${new Date().toLocaleString("en-IN")}`,
        left,
        22
      );

      autoTable(doc, {
        startY: 28,
        head: [["Txn ID", "Order", "Amount", "Status", "Method", "Email", "Date"]],
        body: rows.map((r) => [
          r.id,
          r.orderId,
          `₹${r.amount.toLocaleString()}`,
          r.status,
          r.paymentMethod,
          r.customerEmail,
          formatDate(r.date),
        ]),
        styles: { fontSize: 9 },
        headStyles: { fillColor: [179, 71, 37] }, // brand-ish
        theme: "striped",
        margin: { left, right: 14 },
      });

      const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      doc.save(`transactions-${stamp}.pdf`);
      toast.success("Exported PDF.");
    } catch (e) {
      console.error(e);
      toast.error(
        "PDF export requires jspdf & jspdf-autotable. Run: npm i jspdf jspdf-autotable"
      );
    }
  };

  if (loading) {
    return (
      <div className="p-2 sm:p-3 md:p-4 lg:p-5 xl:p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-7 sm:h-8 bg-muted rounded w-1/4" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 sm:h-28 md:h-32 bg-muted rounded" />
            ))}
          </div>
          <div className="h-56 md:h-64 lg:h-72 bg-muted rounded" />
          <div className="h-72 md:h-80 lg:h-96 bg-muted rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-2 sm:p-3 md:p-4 lg:p-5 xl:p-6 space-y-6">
      {/* Page Title */}
      <h3 className="text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl font-bold text-foreground">
        Sales & Payments
      </h3>

      {/* Sales Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-5 lg:gap-6">
        <SummaryCard label="Total Revenue" value={formatCurrency(salesData?.totalRevenue ?? 0)} emoji="💰" />
        <SummaryCard label="Total Orders" value={(salesData?.totalOrders ?? 0).toLocaleString()} emoji="📦" tone="green" />
        <SummaryCard label="Refunds" value={formatCurrency(salesData?.totalRefunds ?? 0)} emoji="↩️" tone="red" />
        <SummaryCard label="Avg Order Value" value={formatCurrency(salesData?.averageOrderValue ?? 0)} emoji="📊" tone="purple" />
      </div>

      {/* Revenue Chart */}
      <div className="bg-card shadow rounded-lg p-3 sm:p-4 md:p-5 lg:p-6 border border-border">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 mb-4">
          <h2 className="text-base sm:text-lg md:text-xl font-semibold text-foreground">
            Revenue Trends
          </h2>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 bg-background text-foreground border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-sm sm:text-base"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="365d">Last year</option>
          </select>
        </div>
        <div className="h-48 sm:h-56 md:h-64 lg:h-72 xl:h-90">
          <RevenueChart data={chartData} />
        </div>
      </div>

      {/* Transactions */}
      <div className="bg-card shadow rounded-lg border border-border">
        {/* Header */}
        <div className="p-3 sm:p-4 md:p-5 lg:p-6 border-b border-border">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
            <h2 className="text-sm sm:text-base md:text-lg font-semibold text-foreground">
              Recent Transactions
            </h2>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full sm:w-auto px-3 py-2 bg-background text-foreground border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-sm sm:text-base"
              >
                <option value="all">All Status</option>
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
                <option value="refunded">Refunded</option>
              </select>

              {/* Export dropdown */}
              <div className="relative" ref={exportRef}>
                <button
                  onClick={() => setExportOpen((v) => !v)}
                  className="w-full sm:w-auto inline-flex items-center gap-2 bg-primary text-primary-foreground px-3 sm:px-4 py-2 rounded-md font-medium hover:opacity-90 transition text-sm sm:text-base"
                >
                  <HiDownload className="h-5 w-5" />
                  Export
                  <HiChevronDown className={`h-4 w-4 transition ${exportOpen ? "rotate-180" : ""}`} />
                </button>
                {exportOpen && (
                  <div className="absolute right-0 mt-2 min-w-[180px] rounded-md border border-border bg-card text-card-foreground shadow-lg overflow-hidden z-10">
                    <button
                      onClick={() => {
                        setExportOpen(false);
                        exportCSV(filteredTransactions);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-muted/60 text-sm"
                    >
                      Excel (CSV)
                    </button>
                    <button
                      onClick={() => {
                        setExportOpen(false);
                        exportPDF(filteredTransactions);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-muted/60 text-sm"
                    >
                      PDF
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Desktop Table */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="min-w-full w-full table-fixed">
            <thead className="bg-muted/60">
              <tr className="text-muted-foreground">
                <th className="w-1/6 px-3 sm:px-4 md:px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Transaction ID</th>
                <th className="w-1/6 px-3 sm:px-4 md:px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Order ID</th>
                <th className="w-1/6 px-3 sm:px-4 md:px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Amount</th>
                <th className="w-1/4 px-3 sm:px-4 md:px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Payment Method</th>
                <th className="w-1/6 px-3 sm:px-4 md:px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Status</th>
                <th className="w-1/6 px-3 sm:px-4 md:px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredTransactions.map((t) => (
                <tr key={t.id} className="hover:bg-muted/40">
                  <td className="px-3 sm:px-4 md:px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">{t.id}</td>
                  <td className="px-3 sm:px-4 md:px-6 py-4 whitespace-nowrap text-sm text-foreground">{t.orderId}</td>
                  <td className="px-3 sm:px-4 md:px-6 py-4 whitespace-nowrap text-sm text-foreground">{formatCurrency(t.amount)}</td>
                  <td className="px-3 sm:px-4 md:px-6 py-4 whitespace-nowrap text-sm text-foreground truncate max-w-[160px]">{t.paymentMethod}</td>
                  <td className="px-3 sm:px-4 md:px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(t.status)}`}>
                      {t.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-3 sm:px-4 md:px-6 py-4 whitespace-nowrap text-sm text-foreground">{formatDate(t.date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="lg:hidden space-y-3 p-3 sm:p-4">
          {filteredTransactions.map((t) => (
            <div key={t.id} className="bg-card rounded-lg p-3 sm:p-4 border border-border flex flex-col space-y-3">
              <div className="flex justify-between items-start gap-3">
                <div className="min-w-0 flex-1">
                  <span className="font-medium text-sm sm:text-base text-foreground block truncate">#{t.id}</span>
                  <span className="text-xs text-muted-foreground block">{t.customerEmail}</span>
                </div>
                <span className={`px-2 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${getStatusBadge(t.status)} flex-shrink-0`}>
                  {t.status.toUpperCase()}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs sm:text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Order ID:</span>
                  <span className="font-medium text-foreground">{t.orderId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount:</span>
                  <span className="font-medium text-foreground">{formatCurrency(t.amount)}</span>
                </div>
                <div className="flex justify-between col-span-2">
                  <span className="text-muted-foreground">Payment Method:</span>
                  <span className="font-medium text-foreground truncate">{t.paymentMethod}</span>
                </div>
                <div className="flex justify-between col-span-2">
                  <span className="text-muted-foreground">Date:</span>
                  <span className="font-medium text-foreground">{formatDate(t.date)}</span>
                </div>
              </div>
            </div>
          ))}
          {filteredTransactions.length === 0 && (
            <div className="text-center py-8 sm:py-10">
              <p className="text-muted-foreground text-sm sm:text-base">No transactions found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* Small summary card component for tidy markup */
function SummaryCard({
  label,
  value,
  emoji,
  tone,
}: {
  label: string;
  value: string | number;
  emoji: string;
  tone?: "green" | "red" | "purple";
}) {
  const toneBadge =
    tone === "green"
      ? "text-emerald-600"
      : tone === "red"
      ? "text-red-600"
      : tone === "purple"
      ? "text-purple-600"
      : "text-primary";

  const toneBg =
    tone === "green"
      ? "bg-emerald-500/10"
      : tone === "red"
      ? "bg-red-500/10"
      : tone === "purple"
      ? "bg-purple-500/10"
      : "bg-primary/10";

  return (
    <div className="bg-card shadow rounded-lg p-3 sm:p-4 md:p-5 lg:p-6 border border-border">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs sm:text-sm text-muted-foreground">{label}</p>
          <p className={`text-lg sm:text-xl md:text-2xl font-bold text-foreground ${toneBadge ? "" : "text-primary"}`}>
            {value}
          </p>
        </div>
        <div className={`w-10 h-10 md:w-12 md:h-12 ${toneBg} rounded-full flex items-center justify-center flex-shrink-0`}>
          <span className={`text-base sm:text-lg md:text-xl ${toneBadge}`}>{emoji}</span>
        </div>
      </div>
    </div>
  );
}
