"use client";

import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { Search, Percent, Save, X, ExternalLink, Package } from "lucide-react";
import { fetchProducts, updateProduct, type Product } from "@/lib/api";
import { useRouter } from "next/navigation";

export default function DiscountsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<number | undefined>(undefined);
  const [saving, setSaving] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    loadProducts();
  }, []);

  async function loadProducts() {
    try {
      setLoading(true);
      // Fetch all products (not just active) to see discounts on all products
      const data = await fetchProducts("all");
      setProducts(data);
    } catch (error: unknown) {
      console.error("Failed to load products:", error);
      toast.error("Failed to load products");
    } finally {
      setLoading(false);
    }
  }

  function startEdit(product: Product) {
    setEditingId(product.id);
    // Ensure we get the actual discount value, defaulting to 0 if undefined/null
    setEditValue(typeof product.discountPercentage === 'number' ? product.discountPercentage : 0);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditValue(undefined);
  }

  async function saveDiscount(productId: string) {
    try {
      setSaving(productId);
      const product = products.find(p => p.id === productId);
      if (!product) {
        toast.error("Product not found");
        return;
      }

      // Update only the discount percentage field
      // Send the number value (0-100), or undefined to clear discount
      // IMPORTANT: Allow 0 to be saved explicitly (to set no discount)
      let discountValue: number | undefined = undefined;
      if (editValue !== undefined) {
        const numValue = Number(editValue);
        if (!isNaN(numValue) && numValue >= 0 && numValue <= 100) {
          discountValue = numValue; // This includes 0
        }
      }
      
      // Use updateProduct function for consistency with other parts of the app
      await updateProduct(productId, {
        discountPercentage: discountValue,
      });

      toast.success("Discount updated successfully");
      setEditingId(null);
      setEditValue(undefined);
      await loadProducts();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to update discount";
      toast.error(errorMessage);
    } finally {
      setSaving(null);
    }
  }

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const productsWithDiscount = products.filter(p => p.discountPercentage && p.discountPercentage > 0);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Discount Management</h1>
          <p className="text-muted-foreground mt-1">Manage product discounts and offers</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{productsWithDiscount.length}</span> with discount
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search products..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {/* Products Table */}
      {loading ? (
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    <div className="h-4 w-16 bg-muted rounded animate-pulse" />
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    <div className="h-4 w-20 bg-muted rounded animate-pulse" />
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    <div className="h-4 w-32 bg-muted rounded animate-pulse" />
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
                        <div className="h-5 w-32 bg-muted rounded animate-pulse" />
                        <div className="h-6 w-16 bg-gradient-to-br from-orange-200 to-orange-300 rounded-full animate-pulse" />
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-5 w-20 bg-muted rounded animate-pulse" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-8 w-16 bg-gradient-to-br from-red-200 to-red-300 rounded-lg animate-pulse" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-5 w-24 bg-muted rounded animate-pulse" />
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
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <div className="flex flex-col items-center justify-center">
            <Package className="w-12 h-12 mb-4 opacity-20" />
            <p>No products found</p>
          </div>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Product</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Price</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Discount</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Discounted Price</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredProducts.map((product) => {
                  const isEditing = editingId === product.id;
                  // Get discount value - ensure we use the actual value from product
                  const discount = (typeof product.discountPercentage === 'number' && product.discountPercentage >= 0)
                    ? product.discountPercentage 
                    : 0;
                  const discountedPrice = discount > 0 && product.price
                    ? product.price - (product.price * discount / 100)
                    : product.price;

                  return (
                    <tr key={product.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <span className="font-medium text-foreground">{product.name}</span>
                          {discount > 0 && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-500 text-white shadow-sm">
                              {discount}% OFF
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-foreground">₹{product.price.toLocaleString("en-IN")}</span>
                      </td>
                      <td className="px-6 py-4">
                        {isEditing ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="1"
                              value={editValue ?? ""}
                              onChange={(e) => {
                                const val = e.target.value === "" ? undefined : Number(e.target.value);
                                if (val === undefined || (val >= 0 && val <= 100)) {
                                  setEditValue(val);
                                }
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  saveDiscount(product.id);
                                } else if (e.key === "Escape") {
                                  cancelEdit();
                                }
                              }}
                              className="w-24 px-3 py-1.5 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50"
                              placeholder="0-100"
                              autoFocus
                            />
                            <span className="text-sm font-medium text-muted-foreground">%</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            {discount > 0 ? (
                              <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-bold bg-gradient-to-br from-red-500 via-red-600 to-red-700 text-white shadow-md">
                                {discount}%
                              </span>
                            ) : (
                              <span className="text-sm font-medium text-muted-foreground">0%</span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {discount > 0 ? (
                          <div className="flex items-center gap-2.5">
                            <span className="text-sm text-muted-foreground line-through">
                              ₹{product.price.toLocaleString("en-IN")}
                            </span>
                            <span className="text-base font-semibold text-foreground">
                              ₹{Math.round(discountedPrice).toLocaleString("en-IN")}
                            </span>
                          </div>
                        ) : (
                          <span className="text-foreground font-medium">₹{product.price.toLocaleString("en-IN")}</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          {isEditing ? (
                            <>
                              <button
                                onClick={() => saveDiscount(product.id)}
                                disabled={saving === product.id}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed text-sm font-medium"
                                title="Save"
                              >
                                <Save className="w-3.5 h-3.5" />
                                Save
                              </button>
                              <button
                                onClick={cancelEdit}
                                disabled={saving === product.id}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground transition-colors disabled:opacity-60 disabled:cursor-not-allowed text-sm font-medium"
                                title="Cancel"
                              >
                                <X className="w-3.5 h-3.5" />
                                Cancel
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => startEdit(product)}
                                className="p-2 rounded-lg hover:bg-primary/10 text-primary hover:text-primary transition-colors border border-transparent hover:border-primary/20"
                                title="Edit Discount"
                              >
                                <Percent className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => router.push(`/products/${product.id}`)}
                                className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                title="Edit Product"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

