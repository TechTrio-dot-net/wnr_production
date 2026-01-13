// app/testimonials/page.tsx
"use client";

import React, { useMemo, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";

type Status = "Approved" | "Pending";
type RatingValue = 1 | 2 | 3 | 4 | 5;
type RowAction = "" | "edit" | "approve" | "feature" | "homepage" | "delete";

interface Testimonial {
  id: string;
  name: string;
  rating: number; // 1..5
  comment: string;
  status: Status;

  // e-commerce extras
  productId?: string;
  productName?: string;
  verifiedBuyer?: boolean;
  featured?: boolean; // elevate on product & home
  showOnHomepage?: boolean;
  imageUrl?: string;

  createdAt: string;
  updatedAt?: string;
}

export default function TestimonialsPage() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([
    {
      id: "1",
      name: "Sarah Johnson",
      rating: 5,
      comment:
        "Excellent products and fast delivery! Will definitely shop again.",
      status: "Approved",
      productId: "SKU-CHAIR-CLASSIC",
      productName: "Classic Chair",
      verifiedBuyer: true,
      featured: true,
      showOnHomepage: true,
      imageUrl:
        "https://images.unsplash.com/photo-1519710164239-da123dc03ef4?w=800&q=80&auto=format&fit=crop",
      createdAt: "2024-01-04T10:00:00Z",
    },
    {
      id: "2",
      name: "Mike Wilson",
      rating: 4,
      comment: "Good quality, but delivery was a bit slow.",
      status: "Pending",
      productId: "SKU-MUG-RED",
      productName: "Red Mug",
      verifiedBuyer: false,
      featured: false,
      showOnHomepage: false,
      createdAt: "2024-02-14T09:00:00Z",
    },
  ]);

  // ------- Filters -------
  const [q, setQ] = useState("");
  const [ratingFilter, setRatingFilter] = useState<"all" | RatingValue>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | Status>("all");
  const [productFilter, setProductFilter] = useState<string>("all");

  // ------- Modal / Form -------
  const [openModal, setOpenModal] = useState(false);
  const [editing, setEditing] = useState<Testimonial | null>(null);
  const [form, setForm] = useState<Omit<Testimonial, "id" | "createdAt">>({
    name: "",
    rating: 5,
    comment: "",
    status: "Pending",
    productId: "",
    productName: "",
    verifiedBuyer: false,
    featured: false,
    showOnHomepage: false,
    imageUrl: "",
  });

  // ------- Confirm modal -------
  const [confirm, setConfirm] = useState<{
    open: boolean;
    title: string;
    desc?: string;
    onConfirm?: () => void;
  }>({ open: false, title: "" });

  const uniqueProducts = useMemo(() => {
    const names = Array.from(
      new Set(testimonials.map((t) => t.productName || "").filter(Boolean))
    );
    return names;
  }, [testimonials]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return testimonials
      .filter((t) => {
        const matchesQuery =
          !query ||
          t.name.toLowerCase().includes(query) ||
          t.comment.toLowerCase().includes(query) ||
          (t.productName || "").toLowerCase().includes(query) ||
          (t.productId || "").toLowerCase().includes(query);
        const matchesRating =
          ratingFilter === "all" || t.rating === ratingFilter;
        const matchesStatus =
          statusFilter === "all" || t.status === statusFilter;
        const matchesProduct =
          productFilter === "all" ||
          (t.productName || "").toLowerCase() === productFilter.toLowerCase();

        return matchesQuery && matchesRating && matchesStatus && matchesProduct;
      })
      // Featured first, then newest
      .sort((a, b) => {
        if (a.featured && !b.featured) return -1;
        if (!a.featured && b.featured) return 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [testimonials, q, ratingFilter, statusFilter, productFilter]);

  // ------- Helpers -------
  const stars = (rating: number) =>
    Array.from({ length: 5 }, (_, i) => (
      <span
        key={i}
        className={i < rating ? "text-yellow-400" : "text-muted-foreground"}
      >
        ★
      </span>
    ));

  const ratingPicker = (value: number, onPick: (v: number) => void) => (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((r) => (
        <button
          key={r}
          type="button"
          onClick={() => onPick(r)}
          className={`text-lg ${r <= value ? "text-yellow-400" : "text-muted-foreground"}`}
          aria-label={`${r} star${r > 1 ? "s" : ""}`}
        >
          ★
        </button>
      ))}
    </div>
  );

  // ------- Actions -------
  const openCreate = () => {
    setEditing(null);
    setForm({
      name: "",
      rating: 5,
      comment: "",
      status: "Pending",
      productId: "",
      productName: "",
      verifiedBuyer: false,
      featured: false,
      showOnHomepage: false,
      imageUrl: "",
    });
    setOpenModal(true);
  };

  const openEdit = (t: Testimonial) => {
    setEditing(t);
    setForm({
      name: t.name,
      rating: t.rating,
      comment: t.comment,
      status: t.status,
      productId: t.productId || "",
      productName: t.productName || "",
      verifiedBuyer: !!t.verifiedBuyer,
      featured: !!t.featured,
      showOnHomepage: !!t.showOnHomepage,
      imageUrl: t.imageUrl || "",
      updatedAt: t.updatedAt,
    });
    setOpenModal(true);
  };

  const validate = () => {
    if (!form.name.trim()) return toast.error("Name is required."), false;
    if (!form.comment.trim())
      return toast.error("Comment is required."), false;
    if (form.rating < 1 || form.rating > 5)
      return toast.error("Rating must be 1 to 5."), false;
    return true;
  };

  const save = () => {
    if (!validate()) return;

    const payload: Testimonial = {
      id: editing?.id ?? Date.now().toString(),
      ...form,
      createdAt: editing?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (editing) {
      setTestimonials((prev) => prev.map((t) => (t.id === editing.id ? payload : t)));
      toast.success("Testimonial updated.");
    } else {
      setTestimonials((prev) => [payload, ...prev]);
      toast.success("Testimonial created.");
    }
    setOpenModal(false);
    setEditing(null);
  };

  const toggleApprove = (t: Testimonial) => {
    setTestimonials((prev) =>
      prev.map((x) =>
        x.id === t.id ? { ...x, status: x.status === "Approved" ? "Pending" : "Approved" } : x
      )
    );
    toast.success(
      t.status === "Approved" ? "Moved to Pending." : "Approved the testimonial."
    );
  };

  const toggleFeatured = (t: Testimonial) => {
    setTestimonials((prev) =>
      prev.map((x) => (x.id === t.id ? { ...x, featured: !x.featured } : x))
    );
    toast.success(`${t.featured ? "Unfeatured" : "Featured"} on product page.`);
  };

  const toggleHomepage = (t: Testimonial) => {
    setTestimonials((prev) =>
      prev.map((x) =>
        x.id === t.id ? { ...x, showOnHomepage: !x.showOnHomepage } : x
      )
    );
    toast.success(
      `${t.showOnHomepage ? "Removed from" : "Shown on"} homepage carousel.`
    );
  };

  const remove = (t: Testimonial) => {
    setConfirm({
      open: true,
      title: `Delete "${t.name}" review?`,
      desc: "This cannot be undone.",
      onConfirm: () => {
        setTestimonials((prev) => prev.filter((x) => x.id !== t.id));
        toast.success("Testimonial deleted.");
      },
    });
  };

  const handleRowAction = (val: RowAction, t: Testimonial) => {
    switch (val) {
      case "edit":
        return openEdit(t);
      case "approve":
        return toggleApprove(t);
      case "feature":
        return toggleFeatured(t);
      case "homepage":
        return toggleHomepage(t);
      case "delete":
        return remove(t);
      default:
        return;
    }
  };

  // ------- UI -------
  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <h3 className="text-2xl font-bold text-foreground">Testimonials</h3>
        <button
          onClick={openCreate}
          className="bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium hover:opacity-90"
        >
          Create Testimonial
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="text-sm text-muted-foreground">Total</div>
          <div className="text-2xl font-bold">{testimonials.length}</div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="text-sm text-muted-foreground">Approved</div>
          <div className="text-2xl font-bold">
            {testimonials.filter((t) => t.status === "Approved").length}
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="text-sm text-muted-foreground">Featured</div>
          <div className="text-2xl font-bold">
            {testimonials.filter((t) => t.featured).length}
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="text-sm text-muted-foreground">Homepage</div>
          <div className="text-2xl font-bold">
            {testimonials.filter((t) => t.showOnHomepage).length}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, comment, product…"
            className="px-3 py-2 bg-background text-foreground border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <select
            value={ratingFilter}
            onChange={(e) => {
              const v = e.target.value;
              if (v === "all") return setRatingFilter("all");
              const n = Number(v);
              const allowed = [1, 2, 3, 4, 5] as const;
              if (allowed.includes(n as RatingValue)) {
                setRatingFilter(n as RatingValue);
              }
            }}
            className="px-3 py-2 bg-background text-foreground border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">All ratings</option>
            {[5, 4, 3, 2, 1].map((r) => (
              <option key={r} value={r}>
                {r} ★
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value === "all" ? "all" : (e.target.value as Status))
            }
            className="px-3 py-2 bg-background text-foreground border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">All status</option>
            <option value="Approved">Approved</option>
            <option value="Pending">Pending</option>
          </select>
          <select
            value={productFilter}
            onChange={(e) => setProductFilter(e.target.value)}
            className="px-3 py-2 bg-background text-foreground border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">All products</option>
            {uniqueProducts.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full table-fixed">
            <thead className="bg-muted/60 text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide w-56">
                  Customer
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide w-24">
                  Rating
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">
                  Comment
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide w-52">
                  Product
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide w-28">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide w-[260px]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((t) => (
                <tr key={t.id} className="hover:bg-muted/40">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {t.imageUrl ? (
                        <Image
                          src={t.imageUrl}
                          alt={t.name}
                          width={40}
                          height={40}
                          className="h-10 w-10 rounded-md object-cover border border-border"
                          unoptimized
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center text-xs text-muted-foreground">
                          IMG
                        </div>
                      )}
                      <div>
                        <div className="text-sm font-semibold text-foreground">
                          {t.name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {t.verifiedBuyer ? "Verified Buyer" : "Guest"}
                          {t.featured ? " • Featured" : ""}
                          {t.showOnHomepage ? " • Homepage" : ""}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm">{stars(t.rating)}</td>
                  <td className="px-4 py-3 text-sm">
                    <div className="line-clamp-2">{t.comment}</div>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <div className="font-medium">{t.productName || "—"}</div>
                    <div className="text-xs text-muted-foreground">
                      {t.productId || ""}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2.5 py-1 text-xs font-semibold rounded-full ${
                        t.status === "Approved"
                          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20"
                          : "bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20"
                      }`}
                    >
                      {t.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      aria-label="Row actions"
                      value=""
                      onChange={(e) => {
                        const val = e.target.value as RowAction;
                        e.currentTarget.blur();
                        handleRowAction(val, t);
                      }}
                      className="px-3 py-2 bg-background text-foreground border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="" disabled>
                        Actions…
                      </option>
                      <option value="edit">Edit</option>
                      <option value="approve">
                        {t.status === "Approved" ? "Move to Pending" : "Approve"}
                      </option>
                      <option value="feature">
                        {t.featured ? "Unfeature" : "Feature"}
                      </option>
                      <option value="homepage">
                        {t.showOnHomepage ? "Remove from Homepage" : "Show on Homepage"}
                      </option>
                      <option value="delete">Delete</option>
                    </select>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                    No testimonials match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {filtered.map((t) => (
          <div key={t.id} className="bg-card border border-border rounded-xl p-4">
            <div className="flex gap-3 items-start">
              {t.imageUrl ? (
                <Image
                  src={t.imageUrl}
                  alt={t.name}
                  width={48}
                  height={48}
                  className="h-12 w-12 rounded-md object-cover border border-border"
                  unoptimized
                />
              ) : (
                <div className="h-12 w-12 rounded-md bg-muted flex items-center justify-center text-xs text-muted-foreground">
                  IMG
                </div>
              )}
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div className="font-semibold">{t.name}</div>
                  <span
                    className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                      t.status === "Approved"
                        ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20"
                        : "bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20"
                    }`}
                  >
                    {t.status}
                  </span>
                </div>
                <div className="text-sm">{stars(t.rating)}</div>
                <div className="mt-1 text-sm text-muted-foreground line-clamp-3">
                  {t.comment}
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  {t.productName ? (
                    <>
                      <span className="text-foreground">{t.productName}</span>
                      {t.productId ? ` • ${t.productId}` : ""}
                    </>
                  ) : (
                    "—"
                  )}
                  {t.verifiedBuyer ? " • Verified" : ""}
                  {t.featured ? " • Featured" : ""}
                  {t.showOnHomepage ? " • Homepage" : ""}
                </div>

                <div className="mt-3">
                  <select
                    aria-label="Row actions"
                    value=""
                    onChange={(e) => {
                      const val = e.target.value as RowAction;
                      e.currentTarget.blur();
                      handleRowAction(val, t);
                    }}
                    className="w-full px-3 py-2 bg-background text-foreground border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="" disabled>
                      Actions…
                    </option>
                    <option value="edit">Edit</option>
                    <option value="approve">
                      {t.status === "Approved" ? "Move to Pending" : "Approve"}
                    </option>
                    <option value="feature">
                      {t.featured ? "Unfeature" : "Feature"}
                    </option>
                    <option value="homepage">
                      {t.showOnHomepage ? "Remove from Homepage" : "Show on Homepage"}
                    </option>
                    <option value="delete">Delete</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-center text-sm text-muted-foreground py-8">
            No testimonials found.
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {openModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-3">
          <div className="bg-card text-card-foreground border border-border rounded-2xl shadow-xl w-full max-w-3xl">
            <div className="p-5 border-b border-border">
              <h4 className="text-lg font-semibold">
                {editing ? "Edit Testimonial" : "Create Testimonial"}
              </h4>
            </div>

            <div className="p-5 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">
                    Customer Name
                  </label>
                  <input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Priya Singh"
                    className="w-full px-3 py-2 bg-background text-foreground border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">
                    Rating
                  </label>
                  <div className="flex items-center gap-2">
                    {ratingPicker(form.rating, (v) => setForm({ ...form, rating: v }))}
                    <span className="text-sm text-muted-foreground">{form.rating}/5</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">
                    Status
                  </label>
                  <select
                    value={form.status}
                    onChange={(e) =>
                      setForm({ ...form, status: e.target.value as Status })
                    }
                    className="w-full px-3 py-2 bg-background text-foreground border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="Pending">Pending</option>
                    <option value="Approved">Approved</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Comment
                </label>
                <textarea
                  rows={4}
                  value={form.comment}
                  onChange={(e) => setForm({ ...form, comment: e.target.value })}
                  placeholder="Share your experience…"
                  className="w-full px-3 py-2 bg-background text-foreground border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary resize-vertical"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">
                    Product Name
                  </label>
                  <input
                    value={form.productName || ""}
                    onChange={(e) =>
                      setForm({ ...form, productName: e.target.value })
                    }
                    placeholder="e.g. Classic Chair"
                    className="w-full px-3 py-2 bg-background text-foreground border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">
                    Product ID / SKU
                  </label>
                  <input
                    value={form.productId || ""}
                    onChange={(e) =>
                      setForm({ ...form, productId: e.target.value })
                    }
                    placeholder="e.g. SKU-CHAIR-CLASSIC"
                    className="w-full px-3 py-2 bg-background text-foreground border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <label className="inline-flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={!!form.verifiedBuyer}
                    onChange={(e) =>
                      setForm({ ...form, verifiedBuyer: e.target.checked })
                    }
                    className="h-4 w-4 rounded border-border"
                  />
                  <span className="text-foreground">Verified Buyer</span>
                </label>

                <label className="inline-flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={!!form.featured}
                    onChange={(e) =>
                      setForm({ ...form, featured: e.target.checked })
                    }
                    className="h-4 w-4 rounded border-border"
                  />
                  <span className="text-foreground">Featured (Product page)</span>
                </label>

                <label className="inline-flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={!!form.showOnHomepage}
                    onChange={(e) =>
                      setForm({ ...form, showOnHomepage: e.target.checked })
                    }
                    className="h-4 w-4 rounded border-border"
                  />
                  <span className="text-foreground">Show on Homepage</span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Review Image URL (optional)
                </label>
                <input
                  value={form.imageUrl || ""}
                  onChange={(e) =>
                    setForm({ ...form, imageUrl: e.target.value })
                  }
                  placeholder="https://…"
                  className="w-full px-3 py-2 bg-background text-foreground border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
                {form.imageUrl ? (
                  <div className="mt-3">
                    <Image
                      src={form.imageUrl}
                      alt="Preview"
                      width={112}
                      height={112}
                      className="h-28 w-28 rounded-md object-cover border border-border"
                      unoptimized
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                        toast.error("Image failed to load.");
                      }}
                    />
                  </div>
                ) : null}
              </div>
            </div>

            <div className="p-5 border-t border-border flex flex-col sm:flex-row gap-2 justify-end">
              <button
                onClick={() => {
                  setOpenModal(false);
                  setEditing(null);
                }}
                className="px-4 py-2 rounded-md bg-muted border border-border hover:bg-muted/80"
              >
                Cancel
              </button>
              <button
                onClick={save}
                className="px-4 py-2 rounded-md bg-primary text-primary-foreground hover:opacity-90"
              >
                {editing ? "Save Changes" : "Create Testimonial"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Modal */}
      {confirm.open && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-3">
          <div className="bg-card text-card-foreground border border-border rounded-2xl shadow-xl w-full max-w-md">
            <div className="p-5 border-b border-border">
              <h4 className="text-lg font-semibold">{confirm.title}</h4>
              {confirm.desc && (
                <p className="text-sm text-muted-foreground mt-1">{confirm.desc}</p>
              )}
            </div>
            <div className="p-5 flex flex-col sm:flex-row gap-2 justify-end">
              <button
                onClick={() => setConfirm({ open: false, title: "" })}
                className="px-4 py-2 rounded-md bg-muted border border-border hover:bg-muted/80"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  confirm.onConfirm?.();
                  setConfirm({ open: false, title: "" });
                }}
                className="px-4 py-2 rounded-md bg-destructive text-destructive-foreground hover:opacity-90"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
