// src/app/products/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Plus,
  Search,
  Filter,
  Trash2,
  Edit,
  Image as ImageIcon,
  X,
  Upload,
  Check,
  Package
} from "lucide-react";
import { fetchProducts, deleteProduct, updateProduct, type Product } from "@/lib/api";
import { getCategories } from "@/lib/api";
import { toast } from "sonner";
import { logger } from "@/lib/logger";

/** Normalize API base; allow fallback to Next.js rewrite (/api → backend) */
const RAW_BASE = process.env.NEXT_PUBLIC_API_BASE || "";
const API_BASE = RAW_BASE.replace(/\/+$/, "");
const buildUrl = (p: string) => {
  const path = p.startsWith("/") ? p : `/${p}`;
  if (API_BASE) return `${API_BASE}${path}`;
  // Fallback requires next.config.js rewrite for /api/* → backend
  return `${window.location.origin}/api${path}`;
};

type Status = "active" | "inactive" | "draft";

/** Minimal category shape needed here */
type CategoryLite = { _id: string; name: string };

/** Accept common product shapes without any */
type ProductLike = Omit<Product, "category" | "images" | "id"> & {
  _id?: string;
  id?: string;
  status: Status | string;
  category?: string | { _id?: string; id?: string; name?: string };
  images?: Array<string | { url?: string }>;
  hoverImage?: string | { url?: string };

  // optional extended fields your backend may store
  about?: string;
  ingredients?: string;
  description?: string;
  descriptionPoints?: string[];
  eshopboxProductId?: string;
  discountPercentage?: number; // 0-100, e.g., 10 for 10% off
};

type NewProductState = {
  name: string;
  price: number;
  category: string;       // category _id
  stock: number;
  status: Status;
  files: File[];          // main images (3–5)
  hoverFile: File | null; // optional hover image

  eshopboxProductId?: string;

  about: string;
  ingredients: string;
  description: string;
  descriptionPointsText: string; // one bullet per line
};

function errorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === "string") return e;
  try { return JSON.stringify(e); } catch { return "Unexpected error"; }
}

function getId(p: ProductLike): string {
  return p._id ?? p.id ?? "";
}

function extractCategoryId(cat: ProductLike["category"]): string {
  if (!cat) return "";
  if (typeof cat === "string") return cat;
  return cat._id ?? cat.id ?? "";
}

function getPrimaryImageUrl(p: ProductLike): string | null {
  const imgs = Array.isArray(p.images) ? p.images : [];
  const first = imgs[0];
  if (!first) return null;
  return typeof first === "string" ? first : first?.url ?? null;
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

/* ============================== Display Order Inline Editor =============================== */
function DisplayOrderCell({
  productId,
  currentOrder,
  setProducts,
}: {
  productId: string;
  currentOrder: number;
  setProducts: (products: ProductLike[]) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const [saving, setSaving] = useState<string | null>(null);

  const startEdit = () => {
    setEditingId(productId);
    setEditValue(String(currentOrder));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValue("");
  };

  const saveOrder = async () => {
    try {
      setSaving(productId);
      const numValue = Number(editValue);
      if (isNaN(numValue)) {
        toast.error("Please enter a valid number");
        return;
      }

      await updateProduct(productId, { displayOrder: numValue });
      toast.success("Display order updated");
      
      // Reload products to reflect the new order
      const data = await fetchProducts();
      setProducts(data as ProductLike[]);
      
      setEditingId(null);
      setEditValue("");
    } catch (e: unknown) {
      const error = e as { message?: string };
      toast.error(error?.message || "Failed to update display order");
    } finally {
      setSaving(null);
    }
  };

  if (editingId === productId) {
    return (
      <div className="flex items-center gap-1">
        <input
          type="number"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              saveOrder();
            } else if (e.key === "Escape") {
              cancelEdit();
            }
          }}
          className="w-20 px-2 py-1 text-xs border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary"
          autoFocus
          disabled={saving === productId}
        />
        <button
          onClick={saveOrder}
          disabled={saving === productId}
          className="p-1 text-green-600 hover:bg-green-50 rounded disabled:opacity-50"
          title="Save"
        >
          <Check className="w-3 h-3" />
        </button>
        <button
          onClick={cancelEdit}
          disabled={saving === productId}
          className="p-1 text-red-600 hover:bg-red-50 rounded disabled:opacity-50"
          title="Cancel"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    );
  }

  return (
    <div
      className="flex items-center gap-2 group cursor-pointer"
      onClick={startEdit}
      title="Click to edit display order"
    >
      <span className="text-muted-foreground font-mono text-xs">{currentOrder}</span>
      <Edit className="w-3 h-3 opacity-0 group-hover:opacity-50 transition-opacity" />
    </div>
  );
}

export default function ProductsPage() {
  const [products, setProducts] = useState<ProductLike[]>([]);
  const [categories, setCategories] = useState<CategoryLite[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all"); // stores category _id
  const [statusFilter, setStatusFilter] = useState<"all" | Status>("all");

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newProduct, setNewProduct] = useState<NewProductState>({
    name: "",
    price: 0,
    category: "",
    stock: 0,
    status: "active",
    files: [],
    hoverFile: null,
    about: "",
    ingredients: "",
    description: "",
    descriptionPointsText: "",
    eshopboxProductId: "",
  });

  // Previews for main images
  const previews = useMemo(
    () => newProduct.files.map((f) => URL.createObjectURL(f)),
    [newProduct.files]
  );
  // Preview for hover image
  const hoverPreview = useMemo(
    () => (newProduct.hoverFile ? URL.createObjectURL(newProduct.hoverFile) : null),
    [newProduct.hoverFile]
  );
  useEffect(() => {
    return () => {
      previews.forEach((u) => URL.revokeObjectURL(u));
      if (hoverPreview) URL.revokeObjectURL(hoverPreview);
    };
  }, [previews, hoverPreview]);

  // Load products
  useEffect(() => {
    (async () => {
      try {
        const data = await fetchProducts();
        setProducts(data as ProductLike[]);
      } catch (e) {
        console.error("Failed to fetch products:", e);
        toast.error("Failed to fetch products.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Load categories
  useEffect(() => {
    (async () => {
      try {
        const data = await getCategories();
        const safe = (Array.isArray(data) ? data : []).map((c) => ({
          _id: (c as { _id?: string })._id ?? "",
          name: (c as { name?: string }).name ?? "",
        })) as CategoryLite[];
        setCategories(safe);
      } catch (e) {
        console.error("Failed to load categories:", e);
        toast.error("Failed to fetch categories.");
      }
    })();
  }, []);

  // === NEW: fast id→name map so we never show ids ===
  const categoryNameMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of categories) m.set(c._id, c.name);
    return m;
  }, [categories]);

  // Helper to show category name consistently
  const categoryNameForProduct = (p: ProductLike): string => {
    const id = extractCategoryId(p.category);
    if (id && categoryNameMap.has(id)) return categoryNameMap.get(id)!;
    // fallback if backend populated { category: { name } }
    if (p.category && typeof p.category !== "string") {
      return p.category.name ?? "—";
    }
    return "—";
  };

  // Filtered list
  const filteredProducts = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return products.filter((p) => {
      const matchesSearch = p.name?.toLowerCase().includes(q);
      const prodCatId = extractCategoryId(p.category);
      const matchesCategory = categoryFilter === "all" || prodCatId === categoryFilter;
      const matchesStatus = statusFilter === "all" || p.status === statusFilter;
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [products, searchTerm, categoryFilter, statusFilter]);

  /* ===================== File selection (main images) ===================== */
  function onModalFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const allowed = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/avif"];
    const picked: File[] = [];
    let rejected = 0;

    Array.from(files).forEach((f) => {
      if (!allowed.includes(f.type)) rejected++;
      else picked.push(f);
    });

    setNewProduct((prev) => ({ ...prev, files: [...prev.files, ...picked] }));

    if (rejected > 0) toast.warning(`${rejected} file(s) skipped — only JPG/PNG/GIF/WebP/AVIF allowed.`);
    if (picked.length > 0) toast.success(`${picked.length} image(s) selected.`);

    e.currentTarget.value = "";
  }

  function removeSelectedFile(idx: number) {
    setNewProduct((prev) => ({
      ...prev,
      files: prev.files.filter((_, i) => i !== idx),
    }));
  }

  /* ======================== Hover image handlers ========================= */
  function onHoverFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const allowed = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/avif"];
    if (!allowed.includes(f.type)) {
      toast.warning("Only JPG/PNG/GIF/WebP/AVIF allowed.");
      e.currentTarget.value = "";
      return;
    }
    if (hoverPreview) URL.revokeObjectURL(hoverPreview);
    setNewProduct((prev) => ({ ...prev, hoverFile: f }));
    e.currentTarget.value = "";
    toast.success("Hover image selected.");
  }

  function clearHoverFile() {
    if (hoverPreview) URL.revokeObjectURL(hoverPreview);
    setNewProduct((prev) => ({ ...prev, hoverFile: null }));
  }

  /* ============================== Create =============================== */
  async function handleAddProduct() {
    try {
      if (!newProduct.name.trim()) return toast.warning("Please enter a product name.");
      if (!newProduct.eshopboxProductId || !newProduct.eshopboxProductId.trim())
        return toast.warning("Please enter eshopboxProductId.");
      if (!newProduct.category.trim()) return toast.warning("Please select a category.");
      if (newProduct.price <= 0) return toast.warning("Price must be greater than 0.");
      if (!Number.isInteger(newProduct.stock) || newProduct.stock < 0)
        return toast.warning("Stock must be a non-negative integer.");
      if (newProduct.files.length < 3 || newProduct.files.length > 5)
        return toast.warning("Please attach 3–5 product images.");

      const fd = new FormData();
      fd.append("name", newProduct.name.trim());
      fd.append("eshopboxProductId", (newProduct.eshopboxProductId || "").trim());
      fd.append("price", String(newProduct.price));
      fd.append("category", newProduct.category.trim()); // _id
      fd.append("stock", String(newProduct.stock));
      fd.append("status", newProduct.status);

      // New text fields (optional)
      fd.append("about", newProduct.about.trim());
      fd.append("ingredients", newProduct.ingredients.trim());
      fd.append("description", newProduct.description.trim());
      const points = newProduct.descriptionPointsText
        .split("\n")
        .map((l) => l.trim().replace(/^•\s*/, ""))
        .filter(Boolean);
      points.forEach((pt) => fd.append("descriptionPoints", pt)); // send as array

      // Main gallery images
      newProduct.files.forEach((f) => fd.append("images", f));
      // Hover image (optional)
      if (newProduct.hoverFile) fd.append("hover", newProduct.hoverFile);

      const url = buildUrl("/api/products");
      const res = await fetch(url, { method: "POST", body: fd });
      if (!res.ok) throw new Error(await readError(res));
      const created = (await res.json()) as ProductLike;

      const first =
        Array.isArray(created.images) && created.images.length > 0
          ? created.images[0]
          : undefined;
      const imgUrl = typeof first === "string" ? first : first?.url;
      if (imgUrl) toast.success("Uploaded to Cloudinary ✅");

      setProducts((prev) => [...prev, created]);
      handleCloseAddModal();
      toast.success("Product added successfully.");
    } catch (e) {
      console.error("Failed to add product:", e);
      toast.error(errorMessage(e) || "Failed to add product. Please try again.");
    }
  }

  function handleCloseAddModal() {
    previews.forEach((u) => URL.revokeObjectURL(u));
    if (hoverPreview) URL.revokeObjectURL(hoverPreview);
    setIsAddModalOpen(false);
    setNewProduct({
      name: "",
      price: 0,
      category: "",
      stock: 0,
      status: "active",
      files: [],
      hoverFile: null,
      about: "",
      ingredients: "",
      description: "",
      descriptionPointsText: "",
      eshopboxProductId: "",
    });
  }

  /* ============================== Delete =============================== */
  async function handleDeleteProduct(productId: string) {
    if (!window.confirm("Are you sure you want to delete this product?")) return;
    try {
      const product = products.find((p) => getId(p) === productId);
      const productName = product?.name || "Unknown";
      
      await deleteProduct(productId);
      setProducts((prev) => prev.filter((p) => getId(p) !== productId));
      toast.success("Product deleted.");
      
      // Log successful deletion
      logger.success("product_delete", `Product "${productName}" deleted`, {
        resourceType: "product",
        resourceId: productId,
        metadata: { name: productName },
      });
    } catch (e) {
      console.error("Failed to delete product:", e);
      toast.error("Failed to delete product. Please try again.");
      
      // Log error
      logger.error("product_delete", `Failed to delete product ${productId}`, {
        resourceType: "product",
        resourceId: productId,
        metadata: { error: String(e) },
      });
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="h-8 w-48 bg-muted rounded-lg animate-pulse" />
          <div className="h-10 w-32 bg-muted rounded-lg animate-pulse" />
        </div>
        <div className="h-16 bg-muted rounded-xl animate-pulse" />
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    <div className="h-4 w-20 bg-muted rounded animate-pulse" />
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    <div className="h-4 w-16 bg-muted rounded animate-pulse" />
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    <div className="h-4 w-20 bg-muted rounded animate-pulse ml-auto" />
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-orange-200 to-orange-300 rounded-lg animate-pulse" />
                        <div className="h-5 w-32 bg-muted rounded animate-pulse" />
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-5 w-24 bg-muted rounded animate-pulse" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-5 w-16 bg-muted rounded animate-pulse" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-6 w-20 bg-gradient-to-br from-green-200 to-green-300 rounded-full animate-pulse" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <div className="h-8 w-8 bg-muted rounded-lg animate-pulse" />
                        <div className="h-8 w-8 bg-muted rounded-lg animate-pulse" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Products</h1>
          <p className="text-muted-foreground mt-1">Manage your product catalog</p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-xl font-medium hover:bg-primary/90 transition shadow-lg shadow-primary/20"
        >
          <Plus className="w-5 h-5" />
          Add Product
        </button>
      </div>

      {/* Filters */}
      <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full pl-9 pr-8 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer transition-all"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as "all" | Status)}
              className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer transition-all"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="draft">Draft</option>
            </select>
          </div>
        </div>
      </div>

      {/* Product Table */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="px-6 py-4 text-left font-semibold text-muted-foreground uppercase tracking-wider">Product</th>
                <th className="px-6 py-4 text-left font-semibold text-muted-foreground uppercase tracking-wider">Category</th>
                <th className="px-6 py-4 text-left font-semibold text-muted-foreground uppercase tracking-wider">Eshopbox ID</th>
                <th className="px-6 py-4 text-left font-semibold text-muted-foreground uppercase tracking-wider">Price</th>
                <th className="px-6 py-4 text-left font-semibold text-muted-foreground uppercase tracking-wider">Stock</th>
                <th className="px-6 py-4 text-left font-semibold text-muted-foreground uppercase tracking-wider">Display Order</th>
                <th className="px-6 py-4 text-left font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-right font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center">
                      <Package className="w-12 h-12 mb-4 opacity-20" />
                      <p>No products found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const imgUrl = getPrimaryImageUrl(p);
                  const pid = getId(p);
                  return (
                    <tr key={pid} className="group hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div className="relative h-12 w-12 rounded-lg overflow-hidden border border-border bg-muted">
                            {imgUrl ? (
                              <Image
                                src={imgUrl}
                                alt={p.name}
                                fill
                                className="object-cover"
                                unoptimized
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                <ImageIcon className="w-5 h-5 opacity-50" />
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-foreground">{p.name}</span>
                            {typeof p.discountPercentage === 'number' && p.discountPercentage > 0 && (
                              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-500 text-white">
                                {p.discountPercentage}% OFF
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {categoryNameForProduct(p)}
                      </td>
                      <td className="px-6 py-4 text-muted-foreground font-mono text-xs">
                        {p.eshopboxProductId || "—"}
                      </td>
                      <td className="px-6 py-4 font-medium">
                        {p.discountPercentage && p.discountPercentage > 0 ? (
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground line-through text-sm">
                              ₹{Number(p.price || 0).toLocaleString()}
                            </span>
                            <span className="text-foreground">
                              ₹{Math.round(Number(p.price || 0) * (1 - p.discountPercentage / 100)).toLocaleString()}
                            </span>
                          </div>
                        ) : (
                          <span>₹{Number(p.price || 0).toLocaleString()}</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`
                          inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                          ${p.stock > 10 ? 'bg-emerald-500/10 text-emerald-600' : p.stock > 0 ? 'bg-amber-500/10 text-amber-600' : 'bg-rose-500/10 text-rose-600'}
                        `}>
                          {p.stock} in stock
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <DisplayOrderCell
                          productId={pid}
                          currentOrder={p.displayOrder ?? 9999}
                          setProducts={setProducts}
                        />
                      </td>
                      <td className="px-6 py-4">
                        <span className={`
                          inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize border
                          ${p.status === 'active'
                            ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                            : p.status === 'draft'
                              ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                              : 'bg-slate-500/10 text-slate-600 border-slate-500/20'}
                        `}>
                          {p.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 transition-opacity">
                          <Link
                            href={`/products/${pid}`}
                            className="p-2 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={() => handleDeleteProduct(pid)}
                            className="p-2 rounded-lg hover:bg-rose-500/10 text-muted-foreground hover:text-rose-600 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Product Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={handleCloseAddModal}
          />
          <div className="relative w-full max-w-2xl bg-background rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-muted/30">
              <h2 className="text-lg font-bold">Add New Product</h2>
              <button
                onClick={handleCloseAddModal}
                className="p-2 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-2">Product Name</label>
                  <input
                    type="text"
                    value={newProduct.name}
                    onChange={(e) => setNewProduct((p) => ({ ...p, name: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    placeholder="e.g. Premium Wireless Headphones"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Eshopbox ID</label>
                  <input
                    type="text"
                    value={newProduct.eshopboxProductId}
                    onChange={(e) => setNewProduct((p) => ({ ...p, eshopboxProductId: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    placeholder="Product ID"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Category</label>
                  <select
                    value={newProduct.category}
                    onChange={(e) => setNewProduct((p) => ({ ...p, category: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all appearance-none"
                  >
                    <option value="">Select Category</option>
                    {categories.map((cat) => (
                      <option key={cat._id} value={cat._id}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Price (₹)</label>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={newProduct.price}
                    onChange={(e) => setNewProduct((p) => ({ ...p, price: Number(e.target.value) }))}
                    className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Stock</label>
                  <input
                    type="number"
                    min={0}
                    value={newProduct.stock}
                    onChange={(e) => setNewProduct((p) => ({ ...p, stock: Number(e.target.value) }))}
                    className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-2">Status</label>
                  <div className="flex gap-4">
                    {["active", "inactive", "draft"].map((s) => (
                      <label key={s} className="flex items-center gap-2 cursor-pointer group">
                        <div className={`
                          w-5 h-5 rounded-full border flex items-center justify-center transition-colors
                          ${newProduct.status === s ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/30 group-hover:border-primary/50'}
                        `}>
                          {newProduct.status === s && <Check className="w-3 h-3" />}
                        </div>
                        <input
                          type="radio"
                          name="status"
                          value={s}
                          checked={newProduct.status === s}
                          onChange={(e) => setNewProduct((p) => ({ ...p, status: e.target.value as Status }))}
                          className="hidden"
                        />
                        <span className="capitalize text-sm font-medium">{s}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Details */}
              <div className="space-y-4 pt-4 border-t border-border">
                <h3 className="font-semibold">Product Details</h3>

                <div>
                  <label className="block text-sm font-medium mb-2">About</label>
                  <textarea
                    rows={3}
                    value={newProduct.about}
                    onChange={(e) => setNewProduct((p) => ({ ...p, about: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none"
                    placeholder="Short summary..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Description</label>
                  <textarea
                    rows={4}
                    value={newProduct.description}
                    onChange={(e) => setNewProduct((p) => ({ ...p, description: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none"
                    placeholder="Full product description..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Key Points (one per line)</label>
                  <textarea
                    rows={4}
                    value={newProduct.descriptionPointsText}
                    onChange={(e) => setNewProduct((p) => ({ ...p, descriptionPointsText: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none font-mono text-sm"
                    placeholder="• Feature 1&#10;• Feature 2"
                  />
                </div>
              </div>

              {/* Images */}
              <div className="space-y-4 pt-4 border-t border-border">
                <h3 className="font-semibold">Media</h3>

                <div>
                  <label className="block text-sm font-medium mb-2">Gallery Images (3-5)</label>
                  <div className="grid grid-cols-4 gap-4">
                    {previews.map((src, i) => (
                      <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-border group">
                        <Image src={src} alt="" fill className="object-cover" unoptimized />
                        <button
                          onClick={() => removeSelectedFile(i)}
                          className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    <label className="aspect-square rounded-xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5 flex flex-col items-center justify-center cursor-pointer transition-all">
                      <Upload className="w-6 h-6 text-muted-foreground mb-2" />
                      <span className="text-xs text-muted-foreground font-medium">Upload</span>
                      <input type="file" multiple accept="image/*" onChange={onModalFileChange} className="hidden" />
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Hover Image (Optional)</label>
                  <div className="flex items-start gap-4">
                    {hoverPreview ? (
                      <div className="relative w-32 aspect-square rounded-xl overflow-hidden border border-border group">
                        <Image src={hoverPreview} alt="" fill className="object-cover" unoptimized />
                        <button
                          onClick={clearHoverFile}
                          className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <label className="w-32 aspect-square rounded-xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5 flex flex-col items-center justify-center cursor-pointer transition-all">
                        <Upload className="w-6 h-6 text-muted-foreground mb-2" />
                        <span className="text-xs text-muted-foreground font-medium">Upload</span>
                        <input type="file" accept="image/*" onChange={onHoverFileChange} className="hidden" />
                      </label>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-border bg-muted/30 flex justify-end gap-3">
              <button
                onClick={handleCloseAddModal}
                className="px-5 py-2.5 rounded-xl font-medium hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddProduct}
                className="px-5 py-2.5 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
              >
                Create Product
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
