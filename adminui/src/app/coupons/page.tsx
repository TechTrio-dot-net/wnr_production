"use client";

import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Edit2, Trash2, Search, CheckCircle2, XCircle, Calendar } from "lucide-react";
import { getCoupons, createCoupon, updateCoupon, deleteCoupon, type Coupon } from "@/lib/api";

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    description: "",
    discountType: "percentage" as "percentage" | "fixed",
    discountValue: 0,
    minPurchaseAmount: 0,
    maxDiscountAmount: 0,
    validFrom: new Date().toISOString().split("T")[0],
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    usageLimit: 0,
    userLimit: 1,
    isActive: true,
    firstTimeUserOnly: false,
  });

  useEffect(() => {
    loadCoupons();
  }, []);

  async function loadCoupons() {
    try {
      setLoading(true);
      const data = await getCoupons();
      setCoupons(data);
    } catch (error: unknown) {
      console.error("Failed to load coupons:", error);
      toast.error("Failed to load coupons");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (editingCoupon) {
        await updateCoupon(editingCoupon._id, formData);
        toast.success("Coupon updated");
      } else {
        await createCoupon(formData);
        toast.success("Coupon created");
      }
      setShowModal(false);
      setEditingCoupon(null);
      resetForm();
      await loadCoupons();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to save coupon";
      toast.error(errorMessage);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this coupon?")) return;
    try {
      await deleteCoupon(id);
      toast.success("Coupon deleted");
      await loadCoupons();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to delete coupon";
      toast.error(errorMessage);
    }
  }

  function resetForm() {
    setFormData({
      code: "",
      name: "",
      description: "",
      discountType: "percentage",
      discountValue: 0,
      minPurchaseAmount: 0,
      maxDiscountAmount: 0,
      validFrom: new Date().toISOString().split("T")[0],
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      usageLimit: 0,
      userLimit: 1,
      isActive: true,
      firstTimeUserOnly: false,
    });
  }

  function openEditModal(coupon: Coupon) {
    setEditingCoupon(coupon);
    setFormData({
      code: coupon.code,
      name: coupon.name,
      description: coupon.description || "",
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      minPurchaseAmount: coupon.minPurchaseAmount || 0,
      maxDiscountAmount: coupon.maxDiscountAmount || 0,
      validFrom: new Date(coupon.validFrom).toISOString().split("T")[0],
      validUntil: new Date(coupon.validUntil).toISOString().split("T")[0],
      usageLimit: coupon.usageLimit || 0,
      userLimit: coupon.userLimit || 1,
      isActive: coupon.isActive,
      firstTimeUserOnly: coupon.firstTimeUserOnly,
    });
    setShowModal(true);
  }

  const filteredCoupons = coupons.filter((c) =>
    c.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isExpired = (coupon: Coupon) => new Date(coupon.validUntil) < new Date();
  const isActive = (coupon: Coupon) => coupon.isActive && !isExpired(coupon);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Coupon Management</h1>
          <p className="text-muted-foreground mt-1">Create and manage discount coupons</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setEditingCoupon(null);
            setShowModal(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" />
          Create Coupon
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search coupons..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {/* Coupons Table */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading coupons...</div>
      ) : filteredCoupons.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">No coupons found</div>
      ) : (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase">Code</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase">Name</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase">Discount</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase">Validity</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase">Usage</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase">Status</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-muted-foreground uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredCoupons.map((coupon) => (
                  <tr key={coupon._id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-mono font-semibold text-foreground">{coupon.code}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-foreground">{coupon.name}</p>
                        {coupon.description && (
                          <p className="text-xs text-muted-foreground mt-0.5">{coupon.description}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-semibold text-foreground">
                        {coupon.discountType === "percentage"
                          ? `${coupon.discountValue}%${coupon.maxDiscountAmount ? ` (max ₹${coupon.maxDiscountAmount})` : ""}`
                          : `₹${coupon.discountValue}`}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          <span>{new Date(coupon.validUntil).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-foreground">
                        {coupon.usageCount} / {coupon.usageLimit || "∞"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {isActive(coupon) ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          <CheckCircle2 className="w-3 h-3" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                          <XCircle className="w-3 h-3" />
                          {isExpired(coupon) ? "Expired" : "Inactive"}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(coupon)}
                          className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(coupon._id)}
                          className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-red-600 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="relative w-full max-w-2xl rounded-lg bg-white shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
              <h2 className="text-xl font-semibold">{editingCoupon ? "Edit Coupon" : "Create Coupon"}</h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingCoupon(null);
                  resetForm();
                }}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Code *</label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    className="w-full border rounded px-3 py-2"
                    placeholder="SAVE20"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                    placeholder="20% Off"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                    rows={2}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Discount Type *</label>
                  <select
                    value={formData.discountType}
                    onChange={(e) => setFormData({ ...formData, discountType: e.target.value as "percentage" | "fixed" })}
                    className="w-full border rounded px-3 py-2"
                  >
                    <option value="percentage">Percentage</option>
                    <option value="fixed">Fixed Amount</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Discount Value * ({formData.discountType === "percentage" ? "%" : "₹"})
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={formData.discountValue}
                    onChange={(e) => setFormData({ ...formData, discountValue: Number(e.target.value) })}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                {formData.discountType === "percentage" && (
                  <div>
                    <label className="block text-sm font-medium mb-1">Max Discount (₹)</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.maxDiscountAmount}
                      onChange={(e) => setFormData({ ...formData, maxDiscountAmount: Number(e.target.value) })}
                      className="w-full border rounded px-3 py-2"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium mb-1">Min Purchase (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.minPurchaseAmount}
                    onChange={(e) => setFormData({ ...formData, minPurchaseAmount: Number(e.target.value) })}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Valid From *</label>
                  <input
                    type="date"
                    required
                    value={formData.validFrom}
                    onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Valid Until *</label>
                  <input
                    type="date"
                    required
                    value={formData.validUntil}
                    onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Usage Limit</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.usageLimit}
                    onChange={(e) => setFormData({ ...formData, usageLimit: Number(e.target.value) })}
                    className="w-full border rounded px-3 py-2"
                    placeholder="0 = unlimited"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Per User Limit</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.userLimit}
                    onChange={(e) => setFormData({ ...formData, userLimit: Number(e.target.value) })}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div className="md:col-span-2 flex items-center gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="rounded"
                    />
                    <span className="text-sm">Active</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.firstTimeUserOnly}
                      onChange={(e) => setFormData({ ...formData, firstTimeUserOnly: e.target.checked })}
                      className="rounded"
                    />
                    <span className="text-sm">First-time users only</span>
                  </label>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingCoupon(null);
                    resetForm();
                  }}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90">
                  {editingCoupon ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
