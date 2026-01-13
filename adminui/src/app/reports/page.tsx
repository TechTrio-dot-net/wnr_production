"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

type ReportType = "sales" | "orders" | "inventory";

type SalesRow = { date: string; revenue: number; orders: number };
type OrderRow = { id: string; customer: string; amount: number; status: "Completed" | "Processing" | "Pending" | "Cancelled" };
type InventoryRow = { product: string; stock: number; lowStock: boolean };

type ReportData = {
  sales: SalesRow[];
  orders: OrderRow[];
  inventory: InventoryRow[];
};

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<ReportType>("sales");
  const [openExport, setOpenExport] = useState(false);
  const exportRef = useRef<HTMLDivElement | null>(null);

  // Demo data (replace with API later) — memoize so reference is stable
  const reportData = useMemo<ReportData>(
    () => ({
      sales: [
        { date: "2024-01-01", revenue: 1500, orders: 25 },
        { date: "2024-01-02", revenue: 1800, orders: 28 },
        { date: "2024-01-03", revenue: 2200, orders: 32 },
      ],
      orders: [
        { id: "ORD001", customer: "John Doe", amount: 150, status: "Completed" },
        { id: "ORD002", customer: "Jane Smith", amount: 200, status: "Processing" },
        { id: "ORD003", customer: "Bob Wilson", amount: 75, status: "Completed" },
      ],
      inventory: [
        { product: "Product A", stock: 45, lowStock: false },
        { product: "Product B", stock: 12, lowStock: true },
        { product: "Product C", stock: 8, lowStock: true },
      ],
    }),
    []
  );

  // Close export dropdown on outside click / Escape
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setOpenExport(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenExport(false);
    };
    window.addEventListener("click", onClick);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("click", onClick);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  const headers = useMemo(() => {
    switch (activeTab) {
      case "sales":
        return ["Date", "Revenue (₹)", "Orders"];
      case "orders":
        return ["Order ID", "Customer", "Amount (₹)", "Status"];
      case "inventory":
        return ["Product", "Stock Level", "Status"];
      default:
        return [];
    }
  }, [activeTab]);

  const rows: (string | number)[][] = useMemo(() => {
    switch (activeTab) {
      case "sales":
        return reportData.sales.map((r) => [r.date, formatCurrency(r.revenue), r.orders]);
      case "orders":
        return reportData.orders.map((r) => [r.id, r.customer, formatCurrency(r.amount), r.status]);
      case "inventory":
        return reportData.inventory.map((r) => [r.product, r.stock, r.lowStock ? "Low Stock" : "In Stock"]);
      default:
        return [];
    }
  }, [activeTab, reportData]); // ✅ include reportData to satisfy exhaustive-deps

  function formatCurrency(n: number) {
    return `₹${Number(n ?? 0).toLocaleString("en-IN")}`;
  }

  function nowStamp() {
    const d = new Date();
    const pad = (x: number) => String(x).padStart(2, "0");
    return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(
      d.getMinutes()
    )}`;
  }

  function downloadBlob(data: BlobPart, type: string, filename: string) {
    const blob = new Blob([data], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  // ---------- EXPORT: CSV (Excel) ----------
  function exportCSV() {
    try {
      const csv = [headers.join(","), ...rows.map((r) => r.map(escapeCSV).join(","))].join("\r\n");
      downloadBlob(csv, "text/csv;charset=utf-8;", `report-${activeTab}-${nowStamp()}.csv`);
      toast.success("Excel (CSV) exported.");
    } catch (e) {
      console.error(e);
      toast.error("Failed to export CSV.");
    }
  }

  function escapeCSV(val: string | number) {
    const s = String(val ?? "");
    if (s.includes('"') || s.includes(",") || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  }

  // ---------- EXPORT: PDF (typed dynamic imports) ----------
  async function exportPDF() {
    try {
      const { jsPDF } = await import("jspdf");
      const autoTableMod = await import("jspdf-autotable");
      type AutoTable = (
        doc: import("jspdf").jsPDF,
        options: import("jspdf-autotable").UserOptions
      ) => void;

      // Support both ESM default and named export shapes without `any`
      const autoTableFn =
        (autoTableMod as { default?: AutoTable }).default ??
        (autoTableMod as unknown as { autoTable: AutoTable }).autoTable;

      const doc = new jsPDF({ unit: "pt", format: "a4" });

      // Title
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.text(`Report — ${activeTab.toUpperCase()}`, 40, 40);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(90);
      doc.text(`Generated: ${new Date().toLocaleString("en-IN")}`, 40, 58);

      autoTableFn(doc, {
        startY: 80,
        head: [headers],
        body: rows,
        styles: { font: "helvetica", fontSize: 10, cellPadding: 6 },
        headStyles: { fillColor: [240, 240, 245], textColor: 30 },
        alternateRowStyles: { fillColor: [250, 250, 252] },
        margin: { left: 40, right: 40 },
        theme: "striped",
      });

      doc.save(`report-${activeTab}-${nowStamp()}.pdf`);
      toast.success("PDF exported.");
    } catch (err) {
      console.error(err);
      toast.error("Failed to export PDF. Ensure 'jspdf' and 'jspdf-autotable' are installed.");
    }
  }

  const StatusBadge = ({ status }: { status: string }) => {
    const cls =
      status === "Completed"
        ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20"
        : status === "Processing"
        ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20"
        : "bg-muted text-muted-foreground border border-border";
    return <span className={`px-2 py-1 text-xs rounded-full ${cls}`}>{status}</span>;
  };

  const StockBadge = ({ low }: { low: boolean }) => {
    const cls = low
      ? "bg-red-500/10 text-red-700 dark:text-red-300 border border-red-500/20"
      : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20";
    return <span className={`px-2 py-1 text-xs rounded-full ${cls}`}>{low ? "Low Stock" : "In Stock"}</span>;
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h3 className="text-xl sm:text-2xl font-bold text-foreground">Reports</h3>

        {/* Export dropdown */}
        <div className="relative" ref={exportRef}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setOpenExport((v) => !v);
            }}
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium hover:opacity-90 transition-colors"
            type="button"
          >
            Export
            <svg width="16" height="16" viewBox="0 0 20 20" className="opacity-90">
              <path fill="currentColor" d="M5.23 7.21L10 12l4.77-4.79-1.42-1.42L10 9.17 6.65 5.79 5.23 7.21z" />
            </svg>
          </button>
          {openExport && (
            <div
              className="absolute right-0 mt-2 w-44 bg-card text-card-foreground border border-border rounded-md shadow-lg overflow-hidden z-10"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => {
                  setOpenExport(false);
                  exportPDF();
                }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-muted"
              >
                PDF
              </button>
              <button
                onClick={() => {
                  setOpenExport(false);
                  exportCSV();
                }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-muted"
              >
                Excel (CSV)
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card p-4 rounded-lg border border-border shadow">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">Total Records</h3>
          <p className="text-2xl font-bold text-foreground">{rows.length}</p>
        </div>
        <div className="bg-card p-4 rounded-lg border border-border shadow">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">Last Updated</h3>
          <p className="text-sm text-foreground">Just now</p>
        </div>
        <div className="bg-card p-4 rounded-lg border border-border shadow">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">Export Options</h3>
          <p className="text-sm text-foreground">PDF, Excel (CSV)</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border">
        <div className="flex -mb-px">
          {(["sales", "orders", "inventory"] as ReportType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 font-medium text-sm transition-colors ${
                activeTab === tab
                  ? "border-b-2 border-primary text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              type="button"
            >
              {tab[0].toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-card shadow rounded-lg border border-border overflow-x-auto">
        <table className="w-full min-w-full">
          <thead className="bg-muted/60">
            <tr>
              {headers.map((header, i) => (
                <th
                  key={i}
                  className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {activeTab === "sales" &&
              reportData.sales.map((r, idx) => (
                <tr key={idx} className="hover:bg-muted/40">
                  <td className="px-4 sm:px-6 py-4 text-sm text-foreground whitespace-nowrap">{r.date}</td>
                  <td className="px-4 sm:px-6 py-4 text-sm text-foreground whitespace-nowrap">{formatCurrency(r.revenue)}</td>
                  <td className="px-4 sm:px-6 py-4 text-sm text-foreground whitespace-nowrap">{r.orders}</td>
                </tr>
              ))}

            {activeTab === "orders" &&
              reportData.orders.map((r, idx) => (
                <tr key={idx} className="hover:bg-muted/40">
                  <td className="px-4 sm:px-6 py-4 text-sm font-medium text-foreground whitespace-nowrap">{r.id}</td>
                  <td className="px-4 sm:px-6 py-4 text-sm text-foreground whitespace-nowrap">{r.customer}</td>
                  <td className="px-4 sm:px-6 py-4 text-sm text-foreground whitespace-nowrap">{formatCurrency(r.amount)}</td>
                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                    <StatusBadge status={r.status} />
                  </td>
                </tr>
              ))}

            {activeTab === "inventory" &&
              reportData.inventory.map((r, idx) => (
                <tr key={idx} className="hover:bg-muted/40">
                  <td className="px-4 sm:px-6 py-4 text-sm font-medium text-foreground whitespace-nowrap">{r.product}</td>
                  <td className="px-4 sm:px-6 py-4 text-sm text-foreground whitespace-nowrap">{r.stock}</td>
                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                    <StockBadge low={r.lowStock} />
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
