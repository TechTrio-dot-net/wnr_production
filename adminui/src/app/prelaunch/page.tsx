"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Timestamp,
  QueryDocumentSnapshot,
  DocumentData,
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
  where,
  type QueryConstraint,
} from "firebase/firestore";
import { db } from "@/lib/firebaseClient";

/* -------------------------- Types -------------------------- */
export type Registration = {
  id: string;
  city: string | null;
  createdAt: string; // ISO
  email: string;
  fullName: string;
  interest: string | null; // e.g., "GutEase Brew"
  phone: string | null;
  _createdAtTS?: Timestamp | null; // internal
};

/* ------------------------ Utilities ------------------------ */
function isObj(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null;
}
function hasSecondsNanos(x: unknown): x is { seconds: number; nanoseconds: number } {
  return (
    isObj(x) &&
    typeof (x as Record<string, unknown>).seconds === "number" &&
    typeof (x as Record<string, unknown>).nanoseconds === "number"
  );
}

function toISOFromAnyCreatedAt(val: unknown): { iso: string; ts: Timestamp | null } {
  try {
    if (val instanceof Timestamp) {
      return { iso: val.toDate().toISOString(), ts: val };
    }
    if (hasSecondsNanos(val)) {
      const t = new Timestamp(val.seconds, val.nanoseconds);
      return { iso: t.toDate().toISOString(), ts: t };
    }
    if (typeof val === "string") {
      const d = new Date(val);
      return { iso: isNaN(d.getTime()) ? "—" : d.toISOString(), ts: null };
    }
    return { iso: "—", ts: null };
  } catch {
    return { iso: "—", ts: null };
  }
}

function getStr(v: Record<string, unknown>, key: string, fallback = ""): string {
  const x = v[key];
  return typeof x === "string" ? x : fallback;
}
function getNullableStr(v: Record<string, unknown>, key: string): string | null {
  const x = v[key];
  if (x == null) return null;
  return typeof x === "string" ? x : String(x ?? "");
}

function fmtDate(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

function downloadCSV(rows: Registration[]) {
  const header = ["fullName", "email", "phone", "city", "interest", "createdAt", "id"];
  const body = rows.map((r) =>
    [
      r.fullName ?? "",
      r.email ?? "",
      r.phone ?? "",
      r.city ?? "",
      r.interest ?? "",
      r.createdAt ?? "",
      r.id,
    ]
      .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
      .join(",")
  );
  const csv = [header.join(","), ...body].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `registrations_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ----------------------- Page Component ----------------------- */
export default function AdminRegistrationsPage() {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<Registration[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);

  // filters (kept: search / interest / city)
  const [search, setSearch] = useState("");
  const [interestFilter, setInterestFilter] = useState<string>("all");
  const [cityFilter, setCityFilter] = useState<string>("all");

  const pageSize = 20;
  const lastDocRef = useRef<QueryDocumentSnapshot<DocumentData> | null>(null);

  // derive visible rows (client-side search for quick UX)
  const visible = useMemo(() => {
    const s = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (interestFilter !== "all" && (r.interest ?? "") !== interestFilter) return false;
      if (cityFilter !== "all" && (r.city ?? "").toLowerCase() !== cityFilter.toLowerCase())
        return false;
      if (!s) return true;
      const hay = [r.fullName ?? "", r.email ?? "", r.phone ?? "", r.city ?? "", r.interest ?? ""]
        .join(" ")
        .toLowerCase();
      return hay.includes(s);
    });
  }, [rows, search, interestFilter, cityFilter]);

  // dynamic options
  const cities = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => r.city && set.add(r.city));
    return ["all", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [rows]);

  const interests = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => r.interest && set.add(r.interest));
    const base = ["Power Brew", "GutEase Brew", "Sugarwise Brew", "Digestive Brew", "Slim Brew"];
    if (set.size === 0) base.forEach((b) => set.add(b));
    return ["all", ...Array.from(set)];
  }, [rows]);

  // Normalize Firestore doc -> Registration
  function toRegistration(d: QueryDocumentSnapshot<DocumentData>): Registration {
    const v = d.data() as Record<string, unknown>;
    const { iso, ts } = toISOFromAnyCreatedAt(v.createdAt);
    return {
      id: d.id,
      city: getNullableStr(v, "city"),
      email: getStr(v, "email", ""),
      fullName: getStr(v, "fullName", ""),
      interest: getNullableStr(v, "interest"),
      phone: getNullableStr(v, "phone"),
      createdAt: iso,
      _createdAtTS: ts,
    };
  }

  // Firestore fetchers
  async function loadFirstPage() {
    try {
      setLoading(true);
      lastDocRef.current = null;

      const col = collection(db, "registrations");
      const constraints: QueryConstraint[] = [orderBy("createdAt", "desc"), limit(pageSize)];
      if (interestFilter !== "all") constraints.unshift(where("interest", "==", interestFilter));
      if (cityFilter !== "all") constraints.unshift(where("city", "==", cityFilter));

      const snap = await getDocs(query(col, ...constraints));
      const data = snap.docs.map(toRegistration);

      setRows(data);
      setHasMore(snap.docs.length === pageSize);
      lastDocRef.current = snap.docs[snap.docs.length - 1] ?? null;
      setPage(1);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load registrations.");
    } finally {
      setLoading(false);
    }
  }

  async function loadNextPage() {
    if (!hasMore || !lastDocRef.current) return;
    try {
      setLoading(true);
      const col = collection(db, "registrations");
      const constraints: QueryConstraint[] = [
        orderBy("createdAt", "desc"),
        startAfter(lastDocRef.current),
        limit(pageSize),
      ];
      if (interestFilter !== "all") constraints.unshift(where("interest", "==", interestFilter));
      if (cityFilter !== "all") constraints.unshift(where("city", "==", cityFilter));

      const snap = await getDocs(query(col, ...constraints));
      const data = snap.docs.map(toRegistration);

      setRows((prev) => [...prev, ...data]);
      setHasMore(snap.docs.length === pageSize);
      lastDocRef.current = snap.docs[snap.docs.length - 1] ?? lastDocRef.current;
      setPage((p) => p + 1);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load more.");
    } finally {
      setLoading(false);
    }
  }

  // initial + when server-side filters change
  useEffect(() => {
    loadFirstPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interestFilter, cityFilter]);

  /* ----------------------- Detail drawer ----------------------- */
  const [active, setActive] = useState<Registration | null>(null);

  const totalShown = visible.length;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-foreground">Registrations</h1>
        <div className="flex items-center gap-2">
          <div className="text-sm text-muted-foreground">
            Showing: <span className="font-medium">{totalShown}</span>
          </div>
          <button
            onClick={() => downloadCSV(visible)}
            className="px-3 py-2 text-sm bg-white border rounded hover:bg-muted"
          >
            Export CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card shadow rounded-lg p-4 border border-border">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <input
            type="text"
            placeholder="Search name, email, phone, city…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3 py-2 bg-background text-foreground border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-sm"
          />

          <select
            value={interestFilter}
            onChange={(e) => setInterestFilter(e.target.value)}
            className="w-full px-3 py-2 bg-background text-foreground border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-sm"
          >
            {interests.map((c) => (
              <option key={c} value={c}>
                {c === "all" ? "All Interests" : c}
              </option>
            ))}
          </select>

          <select
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            className="w-full px-3 py-2 bg-background text-foreground border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-sm"
          >
            {cities.map((c) => (
              <option key={c} value={c}>
                {c === "all" ? "All Cities" : c}
              </option>
            ))}
          </select>

          {/* spacer to keep grid nice */}
          <div />
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={() => loadFirstPage()}
              className="px-3 py-2 text-sm bg-muted rounded-md"
              title="Refresh"
            >
              Refresh
            </button>
            <div className="text-sm">
              Page <span className="font-medium">{page}</span>
            </div>
            <button
              onClick={loadNextPage}
              disabled={!hasMore || loading}
              className="px-3 py-2 text-sm bg-muted rounded-md disabled:opacity-50"
              title="Load next page"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card shadow rounded-lg border border-border overflow-x-auto">
        <table className="w-full table-auto text-sm">
          <thead className="bg-muted/60 text-muted-foreground">
            <tr>
              <th className="px-4 py-2 text-left">Name</th>
              <th className="px-4 py-2 text-left">Email / Phone</th>
              <th className="px-4 py-2 text-left">City</th>
              <th className="px-4 py-2 text-left">Interest</th>
              <th className="px-4 py-2 text-left">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading && rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6">
                  <div className="animate-pulse h-6 bg-muted rounded w-1/3" />
                </td>
              </tr>
            ) : visible.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-6 text-center text-muted-foreground">
                  No registrations found
                </td>
              </tr>
            ) : (
              visible.map((r) => (
                <tr key={r.id} className="align-top hover:bg-muted/40">
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setActive(r)}
                      className="text-primary hover:underline text-left font-medium"
                      title="Open details"
                    >
                      {r.fullName || "—"}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div>{r.email || "—"}</div>
                    <div className="text-muted-foreground">{r.phone || "—"}</div>
                  </td>
                  <td className="px-4 py-3">{r.city || "—"}</td>
                  <td className="px-4 py-3">{r.interest || "—"}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{fmtDate(r.createdAt)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Detail Drawer */}
      {active && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start md:items-center justify-center p-4">
          <div className="bg-card text-card-foreground w-full max-w-2xl rounded-lg border border-border shadow-lg overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">Registration Details</h3>
              <button
                onClick={() => setActive(null)}
                className="text-sm px-2 py-1 rounded bg-muted"
              >
                Close
              </button>
            </div>

            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-muted-foreground">Full Name</div>
                <div className="font-medium">{active.fullName || "—"}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Email</div>
                <div className="font-medium break-all">{active.email || "—"}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Phone</div>
                <div className="font-medium">{active.phone || "—"}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">City</div>
                <div className="font-medium">{active.city || "—"}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Interest</div>
                <div className="font-medium">{active.interest || "—"}</div>
              </div>
              <div className="text-xs text-muted-foreground">
                <div>Created: {fmtDate(active.createdAt)}</div>
              </div>
            </div>

            <div className="p-4 border-t text-xs text-muted-foreground">
              Document ID: <span className="text-foreground">{active.id}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
