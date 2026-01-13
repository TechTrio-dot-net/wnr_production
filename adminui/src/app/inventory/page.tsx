// src/app/inventory/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import {
  Search,
  Filter,
  Plus,
  RotateCcw,
  AlertTriangle,
  Package,
  Edit,
  Image as ImageIcon,
  X,
  Check,
  Upload
} from "lucide-react";

type InventoryItem = {
  id: string;
  name: string;
  category: string;
  stock: number;
  price: number;
  minStockLevel: number;
  image?: string;
};

export default function InventoryPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  // filters
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [showOnlyLow, setShowOnlyLow] = useState(false);

  // modals
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editing, setEditing] = useState<InventoryItem | null>(null);

  // form states
  const [newItem, setNewItem] = useState<Omit<InventoryItem, "id">>({
    name: "",
    category: "",
    stock: 0,
    price: 0,
    minStockLevel: 0,
    image: "",
  });
  const [editItem, setEditItem] = useState<InventoryItem | null>(null);

  // load from mock storage
  useEffect(() => {
    (async () => {
      try {
        const data = await fetchInventoryMock();
        setInventory(data);
      } catch (e) {
        console.error(e);
        toast.error("Failed to load inventory.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // counters
  const { lowCount, outCount } = useMemo(() => {
    let low = 0;
    let out = 0;
    for (const it of inventory) {
      if (it.stock === 0) out++;
      else if (it.stock <= it.minStockLevel) low++;
    }
    return { lowCount: low, outCount: out };
  }, [inventory]);

  useEffect(() => {
    if (!loading && (lowCount > 0 || outCount > 0)) {
      toast.warning(`${outCount} out of stock, ${lowCount} low stock.`);
    }
  }, [loading, lowCount, outCount]);

  const categories = useMemo(
    () => Array.from(new Set(inventory.map((i) => i.category))).sort(),
    [inventory]
  );

  const filtered = useMemo(() => {
    return inventory.filter((item) => {
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;
      const matchesLow = !showOnlyLow || item.stock === 0 || item.stock <= item.minStockLevel;
      return matchesSearch && matchesCategory && matchesLow;
    });
  }, [inventory, searchTerm, categoryFilter, showOnlyLow]);

  const getBadge = (stock: number, min: number) => {
    if (stock === 0)
      return "bg-red-500/10 text-red-600 border-red-500/20";
    if (stock <= min)
      return "bg-amber-500/10 text-amber-600 border-amber-500/20";
    return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
  };

  // add item (no toast.promise -> we need the created object)
  const onAdd = async () => {
    if (!newItem.name.trim()) return toast.warning("Name is required.");
    if (!newItem.category.trim()) return toast.warning("Category is required.");
    if (newItem.price < 0) return toast.warning("Price cannot be negative.");
    if (newItem.stock < 0) return toast.warning("Stock cannot be negative.");
    if (newItem.minStockLevel < 0) return toast.warning("Min stock cannot be negative.");

    try {
      const created = await addInventoryItemMock(newItem);
      setInventory((prev) => [created, ...prev]);
      toast.success("Item added.");
      setIsAddOpen(false);
      setNewItem({ name: "", category: "", stock: 0, price: 0, minStockLevel: 0, image: "" });
    } catch (e) {
      console.error(e);
      toast.error("Failed to add item.");
    }
  };

  // open edit
  const openEdit = (item: InventoryItem) => {
    setEditing(item);
    setEditItem({ ...item });
    setIsEditOpen(true);
  };

  // save edit (no toast.promise -> just await, then toast)
  const onSaveEdit = async () => {
    if (!editItem || !editing) return;
    if (!editItem.name.trim()) return toast.warning("Name is required.");
    if (!editItem.category.trim()) return toast.warning("Category is required.");
    if (editItem.price < 0 || editItem.stock < 0 || editItem.minStockLevel < 0)
      return toast.warning("Values cannot be negative.");

    try {
      await updateInventoryItemMock(editing.id, editItem);
      setInventory((prev) => prev.map((p) => (p.id === editing.id ? { ...p, ...editItem } : p)));
      toast.success("Item updated.");
      setIsEditOpen(false);
      setEditing(null);
      setEditItem(null);
    } catch (e) {
      console.error(e);
      toast.error("Failed to update item.");
    }
  };

  // file -> base64
  const onPickImage = (file: File, setFn: (url: string) => void) => {
    const allowed = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowed.includes(file.type)) {
      return toast.warning("Only JPG, PNG, GIF, WebP allowed.");
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (ev.target?.result) setFn(ev.target.result as string);
    };
    reader.readAsDataURL(file);
  };

  // reset demo data (optional, handy)
  const onResetDemo = async () => {
    await resetDemoDataMock();
    const fresh = await fetchInventoryMock();
    setInventory(fresh);
    toast.success("Demo data reset.");
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="flex justify-between items-center">
          <div className="h-8 w-48 bg-muted rounded-lg" />
          <div className="h-10 w-32 bg-muted rounded-lg" />
        </div>
        <div className="h-16 bg-muted rounded-xl" />
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 bg-muted rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Inventory</h1>
          <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1 text-rose-600 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
              <AlertTriangle className="w-3 h-3" />
              {outCount} Out of Stock
            </span>
            <span className="flex items-center gap-1 text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
              <AlertTriangle className="w-3 h-3" />
              {lowCount} Low Stock
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onResetDemo}
            className="flex items-center gap-2 bg-muted text-foreground border border-border px-4 py-2.5 rounded-xl font-medium hover:bg-muted/80 transition text-sm"
            title="Re-seed local demo data"
          >
            <RotateCcw className="w-4 h-4" />
            Reset Demo
          </button>
          <button
            onClick={() => setIsAddOpen(true)}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl font-medium hover:bg-primary/90 transition shadow-lg shadow-primary/20 text-sm"
          >
            <Plus className="w-4 h-4" />
            Add Item
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search inventory..."
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
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-3 px-4 py-2.5 bg-background border border-border rounded-xl cursor-pointer hover:bg-muted/50 transition-colors">
            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${showOnlyLow ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground'}`}>
              {showOnlyLow && <Check className="w-3.5 h-3.5" />}
            </div>
            <input
              type="checkbox"
              checked={showOnlyLow}
              onChange={(e) => setShowOnlyLow(e.target.checked)}
              className="hidden"
            />
            <span className="text-sm font-medium">Show low/out-of-stock only</span>
          </label>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Product</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Stock Level</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Min Stock</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Price</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((it) => {
                const badge = getBadge(it.stock, it.minStockLevel);
                return (
                  <tr key={it.id} className="group hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="relative h-10 w-10 rounded-lg overflow-hidden bg-muted border border-border">
                          {it.image ? (
                            <Image
                              src={it.image}
                              alt={it.name}
                              fill
                              className="object-cover"
                              unoptimized
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ImageIcon className="w-4 h-4 text-muted-foreground opacity-50" />
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-foreground">{it.name}</div>
                          <div className="text-xs text-muted-foreground">{it.category}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{it.stock}</span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${badge}`}>
                          {it.stock === 0 ? "Out of Stock" : it.stock <= it.minStockLevel ? "Low Stock" : "In Stock"}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{it.minStockLevel}</td>
                    <td className="px-6 py-4 text-sm font-medium">₹{it.price.toLocaleString()}</td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => openEdit(it)}
                        className="p-2 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                        title="Edit Item"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center">
                      <Package className="w-12 h-12 mb-4 opacity-20" />
                      <p>No inventory items found</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setIsAddOpen(false)}
          />
          <div className="relative w-full max-w-lg bg-background rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-border bg-muted/30 flex items-center justify-between">
              <h4 className="text-lg font-bold">Add New Item</h4>
              <button onClick={() => setIsAddOpen(false)} className="p-2 hover:bg-muted rounded-lg transition-colors">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-2">Name</label>
                  <input
                    className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    value={newItem.name}
                    onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                    placeholder="Item name"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-2">Category</label>
                  <input
                    className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    value={newItem.category}
                    onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                    placeholder="Category"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Price (₹)</label>
                  <input
                    type="number"
                    min={0}
                    className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    value={newItem.price}
                    onChange={(e) => setNewItem({ ...newItem, price: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Stock</label>
                  <input
                    type="number"
                    min={0}
                    className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    value={newItem.stock}
                    onChange={(e) => setNewItem({ ...newItem, stock: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Min Stock</label>
                  <input
                    type="number"
                    min={0}
                    className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    value={newItem.minStockLevel}
                    onChange={(e) => setNewItem({ ...newItem, minStockLevel: Number(e.target.value) })}
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-2">Image</label>
                  <label className="flex items-center gap-3 px-4 py-2.5 bg-background border border-border rounded-xl cursor-pointer hover:bg-muted/50 transition-colors border-dashed">
                    <Upload className="w-5 h-5 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Upload Image</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) onPickImage(f, (url) => setNewItem((p) => ({ ...p, image: url })));
                      }}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-border bg-muted/30 flex justify-end gap-3">
              <button
                onClick={() => setIsAddOpen(false)}
                className="px-5 py-2.5 rounded-xl font-medium hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={onAdd}
                className="px-5 py-2.5 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
              >
                Add Item
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isEditOpen && editItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setIsEditOpen(false)}
          />
          <div className="relative w-full max-w-lg bg-background rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-border bg-muted/30 flex items-center justify-between">
              <h4 className="text-lg font-bold">Edit Item</h4>
              <button onClick={() => setIsEditOpen(false)} className="p-2 hover:bg-muted rounded-lg transition-colors">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-2">Name</label>
                  <input
                    className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    value={editItem.name}
                    onChange={(e) => setEditItem({ ...editItem, name: e.target.value })}
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-2">Category</label>
                  <input
                    className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    value={editItem.category}
                    onChange={(e) => setEditItem({ ...editItem, category: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Price (₹)</label>
                  <input
                    type="number"
                    min={0}
                    className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    value={editItem.price}
                    onChange={(e) => setEditItem({ ...editItem, price: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Min Stock</label>
                  <input
                    type="number"
                    min={0}
                    className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    value={editItem.minStockLevel}
                    onChange={(e) => setEditItem({ ...editItem, minStockLevel: Number(e.target.value) })}
                  />
                </div>

                <div className="col-span-2 p-4 bg-muted/30 rounded-xl border border-border">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium">Current Stock</span>
                    <span className="text-xl font-bold">{editItem.stock}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setEditItem(p => p ? { ...p, stock: Math.max(0, p.stock - 1) } : p)}
                      className="flex-1 py-2 rounded-lg bg-background border border-border hover:bg-muted transition-colors text-sm font-medium"
                    >
                      -1
                    </button>
                    <button
                      onClick={() => setEditItem(p => p ? { ...p, stock: p.stock + 1 } : p)}
                      className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-sm font-medium"
                    >
                      +1
                    </button>
                  </div>
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-2">Image</label>
                  <label className="flex items-center gap-3 px-4 py-2.5 bg-background border border-border rounded-xl cursor-pointer hover:bg-muted/50 transition-colors border-dashed">
                    <Upload className="w-5 h-5 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Change Image</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) onPickImage(f, (url) => setEditItem((p) => (p ? { ...p, image: url } : p)));
                      }}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-border bg-muted/30 flex justify-end gap-3">
              <button
                onClick={() => setIsEditOpen(false)}
                className="px-5 py-2.5 rounded-xl font-medium hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={onSaveEdit}
                className="px-5 py-2.5 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   MOCK STORAGE (localStorage) — duplicate seed data included
   Replace with real API later. Everything returns Promises.
   ============================================================ */

const STORAGE_KEY = "inventory_demo_data_v1";

async function simulateDelay(ms = 250) {
  await new Promise((r) => setTimeout(r, ms));
}

function uid() {
  const g = globalThis as unknown as { crypto?: { randomUUID?: () => string } };
  const rand = g?.crypto?.randomUUID?.();
  if (rand) return rand;
  return String(Date.now()) + Math.random().toString(16).slice(2);
}

const SEED: InventoryItem[] = [
  {
    id: uid(),
    name: "Organic Almond Butter",
    category: "Grocery",
    stock: 8,
    minStockLevel: 10,
    price: 425,
    image: "",
  },
  {
    id: uid(),
    name: "Organic Almond Butter",
    category: "Grocery",
    stock: 0,
    minStockLevel: 6,
    price: 435,
    image: "",
  },
  {
    id: uid(),
    name: "Cold Pressed Coconut Oil",
    category: "Grocery",
    stock: 4,
    minStockLevel: 5,
    price: 299,
    image: "",
  },
  {
    id: uid(),
    name: "Herbal Green Tea",
    category: "Beverages",
    stock: 22,
    minStockLevel: 8,
    price: 199,
    image: "",
  },
  {
    id: uid(),
    name: "Granola Clusters",
    category: "Snacks",
    stock: 1,
    minStockLevel: 3,
    price: 159,
    image: "",
  },
  {
    id: uid(),
    name: "Wild Honey",
    category: "Grocery",
    stock: 14,
    minStockLevel: 6,
    price: 349,
    image: "",
  },
  {
    id: uid(),
    name: "Reusable Glass Bottle",
    category: "Accessories",
    stock: 0,
    minStockLevel: 2,
    price: 249,
    image: "",
  },
  {
    id: uid(),
    name: "Protein Trail Mix",
    category: "Snacks",
    stock: 9,
    minStockLevel: 7,
    price: 279,
    image: "",
  },
];

function readStore(): InventoryItem[] {
  if (typeof window === "undefined") return [...SEED];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED));
      return [...SEED];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error("Bad data");
    return parsed;
  } catch {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED));
    return [...SEED];
  }
}

function writeStore(data: InventoryItem[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export async function fetchInventoryMock(): Promise<InventoryItem[]> {
  await simulateDelay();
  return readStore();
}

export async function addInventoryItemMock(
  item: Omit<InventoryItem, "id">
): Promise<InventoryItem> {
  await simulateDelay();
  const store = readStore();
  const created: InventoryItem = { ...item, id: uid() };
  store.unshift(created);
  writeStore(store);
  return created;
}

export async function updateInventoryItemMock(
  id: string,
  patch: Partial<InventoryItem>
): Promise<void> {
  await simulateDelay();
  const store = readStore();
  const idx = store.findIndex((i) => i.id === id);
  if (idx === -1) throw new Error("Not found");
  store[idx] = { ...store[idx], ...patch };
  writeStore(store);
}

export async function resetDemoDataMock(): Promise<void> {
  await simulateDelay(150);
  writeStore([...SEED]);
}
