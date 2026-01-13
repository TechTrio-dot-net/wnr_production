// src/app/inbox/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";

/** ================= API URL helper (same pattern as your example) ================= */
const RAW_BASE = process.env.NEXT_PUBLIC_API_BASE || "";
const API_BASE = RAW_BASE.replace(/\/+$/, "");
const buildUrl = (p: string) => {
  const path = p.startsWith("/") ? p : `/${p}`;
  if (API_BASE) return `${API_BASE}${path}`;
  // Fallback requires a Next.js rewrite for /api/* → backend
  return `${window.location.origin}${path}`;
};

/** ================= Types ================= */
type ReasonOption =
  | "Orders"
  | "Product question"
  | "Gifting / Corporate"
  | "Collabs / Events"
  | "Feedback";

type InboxStatus = "open" | "confirmed" | "resolved" | "archived";

type ContactMeta = {
  ip?: string;
  referer?: string;
  userAgent?: string;
};

type ContactMessage = {
  _id: string;
  name: string;
  email: string;
  phone?: string | null;
  subject?: string | null;
  message: string;
  reason: ReasonOption;
  interests: string[];
  status: InboxStatus;
  meta?: ContactMeta;
  createdAt: string; // ISO
  updatedAt?: string; // ISO
  confirmedAt?: string; // ISO
};

type ListResp =
  | { ok: true; items: ContactMessage[]; total: number; page: number; pageSize: number }
  | { ok: false; error: string };

type UpdateResp =
  | { ok: true; item: ContactMessage }
  | { ok: false; error: string; fields?: Record<string, string> };

/** ================= Utilities ================= */
function fmtDate(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

async function readError(res: Response): Promise<string> {
  try {
    const text = await res.text();
    try {
      const json = JSON.parse(text) as { error?: string; message?: string };
      return json.error || json.message || text || `${res.status}`;
    } catch {
      return text || `${res.status}`;
    }
  } catch {
    return `${res.status}`;
  }
}

/** Status badge styles */
const statusClass: Record<InboxStatus, string> = {
  open: "bg-amber-100 text-amber-800 border-amber-200",
  confirmed: "bg-blue-100 text-blue-800 border-blue-200",
  resolved: "bg-emerald-100 text-emerald-800 border-emerald-200",
  archived: "bg-zinc-100 text-zinc-700 border-zinc-200",
};

/** ======= Typed option sets + guards (remove `any`) ======= */
const REASON_OPTIONS = [
  "Orders",
  "Product question",
  "Gifting / Corporate",
  "Collabs / Events",
  "Feedback",
] as const;

const STATUS_OPTIONS = ["open", "confirmed", "resolved", "archived"] as const;

function toReasonFilter(v: string): "all" | ReasonOption {
  if (v === "all") return "all";
  return (REASON_OPTIONS as readonly string[]).includes(v) ? (v as ReasonOption) : "all";
}

function toStatusFilter(v: string): "all" | InboxStatus {
  if (v === "all") return "all";
  return (STATUS_OPTIONS as readonly string[]).includes(v) ? (v as InboxStatus) : "all";
}

/** ================= Page ================= */
export default function ContactInboxPage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ContactMessage[]>([]);
  const [total, setTotal] = useState(0);

  // filters
  const [searchTerm, setSearchTerm] = useState("");
  const [reasonFilter, setReasonFilter] = useState<"all" | ReasonOption>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | InboxStatus>("open");

  // pagination (simple)
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // detail drawer
  const [active, setActive] = useState<ContactMessage | null>(null);
  const [updateNote, setUpdateNote] = useState("");

  // Load list
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        params.set("page", String(page));
        params.set("pageSize", String(pageSize));
        if (searchTerm.trim()) params.set("q", searchTerm.trim());
        if (reasonFilter !== "all") params.set("reason", reasonFilter);
        if (statusFilter !== "all") params.set("status", statusFilter);

        const url = buildUrl(`/api/contact?${params.toString()}`);
        const headers: Record<string, string> = { Accept: "application/json" };
        try { if (typeof window !== "undefined") {
          const t = window.localStorage.getItem("wnr_admin_token");
          if (t) headers["Authorization"] = `Bearer ${t}`;
        } } catch {}
        const res = await fetch(url, { method: "GET", headers });
        if (!res.ok) throw new Error(await readError(res));
        const data = (await res.json()) as ListResp;
        if (!data.ok) throw new Error(data.error || "Failed to fetch inbox.");

        setItems(data.items);
        setTotal(data.total);
      } catch (e) {
        console.error("Inbox fetch failed", e);
        toast.error("Failed to load contact inbox.");
      } finally {
        setLoading(false);
      }
    })();
  }, [page, pageSize, searchTerm, reasonFilter, statusFilter]);

  // derived
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  /** =========== Actions =========== */

  async function updateStatus(
    id: string,
    nextStatus: InboxStatus,
    note?: string
  ): Promise<ContactMessage | null> {
    try {
      const url = buildUrl(`/api/contact/${id}`);
      const res = await fetch(url, {
        method: "PATCH",
          headers: ((): Record<string,string> => {
            const h: Record<string,string> = { "Content-Type": "application/json", Accept: "application/json" };
            try { if (typeof window !== "undefined") {
              const t = window.localStorage.getItem("wnr_admin_token"); if (t) h["Authorization"] = `Bearer ${t}`;
            } } catch {}
            return h;
          })(),
        body: JSON.stringify({
          status: nextStatus,
          internalNote: note || undefined,
          confirm: nextStatus === "confirmed" ? true : undefined,
        }),
      });

      if (!res.ok) {
        throw new Error(await readError(res));
      }

      const data = (await res.json()) as UpdateResp;

      if (!data.ok) {
        throw new Error(data.error || "Update failed");
      }

      return data.item;
    } catch (e) {
      console.error("Update failed", e);
      toast.error(typeof e === "string" ? e : (e as Error).message || "Update failed.");
      return null;
    }
  }

  function optimisticReplace(updated: ContactMessage) {
    setItems((prev) => prev.map((m) => (m._id === updated._id ? updated : m)));
    if (active && active._id === updated._id) {
      setActive(updated);
    }
  }

  async function handleConfirm(m: ContactMessage) {
    const note = updateNote.trim() || undefined;
    const before = m;
    const optimistic: ContactMessage = {
      ...m,
      status: "confirmed",
      confirmedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    optimisticReplace(optimistic);

    const fresh = await updateStatus(m._id, "confirmed", note);
    if (fresh) {
      optimisticReplace(fresh);
      toast.success("Conversation confirmed.");
      setUpdateNote("");
    } else {
      optimisticReplace(before);
    }
  }

  async function handleResolve(m: ContactMessage) {
    const note = updateNote.trim() || undefined;
    const before = m;
    const optimistic: ContactMessage = {
      ...m,
      status: "resolved",
      updatedAt: new Date().toISOString(),
    };
    optimisticReplace(optimistic);

    const fresh = await updateStatus(m._id, "resolved", note);
    if (fresh) {
      optimisticReplace(fresh);
      toast.success("Marked as resolved.");
      setUpdateNote("");
    } else {
      optimisticReplace(before);
    }
  }

  async function handleArchive(m: ContactMessage) {
    if (!confirm("Archive this conversation?")) return;
    const before = m;
    const optimistic: ContactMessage = {
      ...m,
      status: "archived",
      updatedAt: new Date().toISOString(),
    };
    optimisticReplace(optimistic);

    const fresh = await updateStatus(m._id, "archived");
    if (fresh) {
      optimisticReplace(fresh);
      toast.success("Conversation archived.");
    } else {
      optimisticReplace(before);
    }
  }

  /** =========== UI =========== */

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-foreground">Contact Inbox</h1>
        <div className="text-sm text-muted-foreground">
          Total: <span className="font-medium">{total}</span>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card shadow rounded-lg p-4 border border-border">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <input
            type="text"
            placeholder="Search name, email, subject, message…"
            value={searchTerm}
            onChange={(e) => {
              setPage(1);
              setSearchTerm(e.target.value);
            }}
            className="w-full px-3 py-2 bg-background text-foreground border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-sm"
          />

          <select
            value={reasonFilter}
            onChange={(e) => {
              setPage(1);
              setReasonFilter(toReasonFilter(e.target.value));
            }}
            className="w-full px-3 py-2 bg-background text-foreground border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-sm"
          >
            <option value="all">All Reasons</option>
            {REASON_OPTIONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => {
              setPage(1);
              setStatusFilter(toStatusFilter(e.target.value));
            }}
            className="w-full px-3 py-2 bg-background text-foreground border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-sm"
          >
            <option value="all">All Status</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s[0].toUpperCase() + s.slice(1)}
              </option>
            ))}
          </select>

          {/* Pagination */}
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-2 text-sm bg-muted rounded-md disabled:opacity-50"
            >
              Prev
            </button>
            <div className="text-sm">
              Page <span className="font-medium">{page}</span> / {totalPages}
            </div>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-3 py-2 text-sm bg-muted rounded-md disabled:opacity-50"
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
              <th className="px-4 py-2 text-left">From</th>
              <th className="px-4 py-2 text-left">Subject</th>
              <th className="px-4 py-2 text-left">Reason</th>
              <th className="px-4 py-2 text-left">Created</th>
              <th className="px-4 py-2 text-left">Status</th>
              <th className="px-4 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-6">
                  <div className="animate-pulse h-6 bg-muted rounded w-1/3" />
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-6 text-center text-muted-foreground">
                  No conversations found
                </td>
              </tr>
            ) : (
              items.map((m) => (
                <tr key={m._id} className="align-top">
                  <td className="px-4 py-3">
                    <div className="font-medium">{m.name || "—"}</div>
                    <div className="text-muted-foreground">{m.email}</div>
                    {m.phone ? <div className="text-muted-foreground">{m.phone}</div> : null}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setActive(m)}
                      className="text-primary hover:underline text-left"
                      title="Open conversation"
                    >
                      {m.subject || "—"}
                    </button>
                    <div className="line-clamp-2 text-muted-foreground mt-1 max-w-[520px]">
                      {m.message}
                    </div>
                  </td>
                  <td className="px-4 py-3">{m.reason}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{fmtDate(m.createdAt)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded border text-xs ${statusClass[m.status]}`}
                    >
                      {m.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      {m.status === "open" && (
                        <button
                          onClick={() => handleConfirm(m)}
                          className="px-3 py-1.5 rounded bg-blue-600 text-white text-xs hover:opacity-90"
                        >
                          Confirm
                        </button>
                      )}
                      {m.status !== "resolved" && (
                        <button
                          onClick={() => handleResolve(m)}
                          className="px-3 py-1.5 rounded bg-emerald-600 text-white text-xs hover:opacity-90"
                        >
                          Resolve
                        </button>
                      )}
                      {m.status !== "archived" && (
                        <button
                          onClick={() => handleArchive(m)}
                          className="px-3 py-1.5 rounded bg-zinc-200 text-zinc-800 text-xs hover:opacity-90"
                        >
                          Archive
                        </button>
                      )}
                      <a
                        className="px-3 py-1.5 rounded bg-white border text-xs hover:bg-muted"
                        href={`mailto:${encodeURIComponent(m.email)}?subject=${encodeURIComponent(
                          m.subject || "Re: your message"
                        )}`}
                      >
                        Reply
                      </a>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Drawer / Modal */}
      {active && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start md:items-center justify-center p-4">
          <div className="bg-card text-card-foreground w-full max-w-3xl rounded-lg border border-border shadow-lg overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">Conversation</h3>
              <button
                onClick={() => {
                  setActive(null);
                  setUpdateNote("");
                }}
                className="text-sm px-2 py-1 rounded bg-muted"
              >
                Close
              </button>
            </div>

            <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Left meta */}
              <div className="md:col-span-1 space-y-2">
                <div>
                  <div className="text-xs text-muted-foreground">From</div>
                  <div className="font-medium">{active.name}</div>
                  <div className="text-muted-foreground">{active.email}</div>
                  {active.phone ? <div className="text-muted-foreground">{active.phone}</div> : null}
                </div>

                <div>
                  <div className="text-xs text-muted-foreground">Reason</div>
                  <div>{active.reason}</div>
                </div>

                <div>
                  <div className="text-xs text-muted-foreground">Interests</div>
                  <div className="flex flex-wrap gap-1">
                    {active.interests?.length
                      ? active.interests.map((t) => (
                          <span key={t} className="px-2 py-0.5 text-xs rounded bg-muted">
                            {t}
                          </span>
                        ))
                      : "—"}
                  </div>
                </div>

                <div>
                  <div className="text-xs text-muted-foreground">Status</div>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded border text-xs ${statusClass[active.status]}`}
                  >
                    {active.status}
                  </span>
                </div>

                <div className="text-xs text-muted-foreground space-y-1">
                  <div>Created: {fmtDate(active.createdAt)}</div>
                  <div>Updated: {fmtDate(active.updatedAt)}</div>
                  <div>Confirmed: {fmtDate(active.confirmedAt)}</div>
                </div>

                {active.meta ? (
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div className="font-medium text-foreground text-sm">Meta</div>
                    {active.meta.ip ? <div>IP: {active.meta.ip}</div> : null}
                    {active.meta.referer ? <div>Referrer: {active.meta.referer}</div> : null}
                    {active.meta.userAgent ? (
                      <div className="break-all">UA: {active.meta.userAgent}</div>
                    ) : null}
                  </div>
                ) : null}

                <div className="pt-2">
                  <a
                    className="inline-flex items-center px-3 py-1.5 rounded bg-white border text-xs hover:bg-muted"
                    href={`mailto:${encodeURIComponent(active.email)}?subject=${encodeURIComponent(
                      active.subject || "Re: your message"
                    )}`}
                  >
                    Reply via Email
                  </a>
                </div>
              </div>

              {/* Right content */}
              <div className="md:col-span-2 space-y-4">
                <div>
                  <div className="text-xs text-muted-foreground">Subject</div>
                  <div className="font-medium">{active.subject || "—"}</div>
                </div>

                <div>
                  <div className="text-xs text-muted-foreground">Message</div>
                  <div className="whitespace-pre-wrap leading-relaxed">{active.message}</div>
                </div>

                <div className="pt-2">
                  <label className="block text-sm font-medium mb-1">Internal note (optional)</label>
                  <textarea
                    rows={3}
                    value={updateNote}
                    onChange={(e) => setUpdateNote(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md text-sm bg-background"
                    placeholder="Add a short note for your team…"
                  />
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  {active.status === "open" && (
                    <button
                      onClick={() => handleConfirm(active)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:opacity-90"
                    >
                      Confirm
                    </button>
                  )}
                  {active.status !== "resolved" && (
                    <button
                      onClick={() => handleResolve(active)}
                      className="px-4 py-2 bg-emerald-600 text-white rounded-md text-sm hover:opacity-90"
                    >
                      Mark Resolved
                    </button>
                  )}
                  {active.status !== "archived" && (
                    <button
                      onClick={() => handleArchive(active)}
                      className="px-4 py-2 bg-zinc-200 text-zinc-800 rounded-md text-sm hover:opacity-90"
                    >
                      Archive
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setActive(null);
                      setUpdateNote("");
                    }}
                    className="px-4 py-2 bg-muted rounded-md text-sm"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>

             {/* Footer (optional quick links) */}
            <div className="p-4 border-t text-xs text-muted-foreground">
              Need to change fields?{" "}
              <Link className="text-primary hover:underline" href="#">
                open in full view
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

           
