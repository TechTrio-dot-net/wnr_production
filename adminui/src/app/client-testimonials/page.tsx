"use client";

import React, { useEffect, useState } from "react";
import { http, buildUrl } from "@/lib/api";
import { toast } from "sonner";
import { Plus, Edit2, Trash2, Image as ImageIcon } from "lucide-react";
import Image from "next/image";

type Testimonial = {
  _id: string;
  name: string;
  headline: string;
  quote: string;
  rating: number;
  productImageUrl?: string;
  countryCode?: string;
  isActive: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
};

type TestimonialsResponse = {
  testimonials: Testimonial[];
};

export default function ClientTestimonialsPage() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Testimonial | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [formData, setFormData] = useState<{
    name: string;
    headline: string;
    quote: string;
    rating: number;
    productImageUrl: string;
    countryCode: string;
    isActive: boolean;
    displayOrder: number;
    imageFile?: File;
  }>({
    name: "",
    headline: "",
    quote: "",
    rating: 5,
    productImageUrl: "",
    countryCode: "",
    isActive: true,
    displayOrder: 0,
  });

  useEffect(() => {
    fetchTestimonials();
  }, []);

  async function fetchTestimonials() {
    try {
      setLoading(true);
      const data = await http<TestimonialsResponse>("/api/testimonials/admin");
      setTestimonials(data.testimonials || []);
    } catch (error: unknown) {
      toast.error((error as Error)?.message || "Failed to load testimonials");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const fd = new FormData();
      fd.append("name", formData.name);
      fd.append("headline", formData.headline);
      fd.append("quote", formData.quote);
      fd.append("rating", String(formData.rating));
      fd.append("countryCode", formData.countryCode);
      fd.append("isActive", String(formData.isActive));
      fd.append("displayOrder", String(formData.displayOrder));
      
      // If there's a new file, upload it; otherwise use existing URL
      if (formData.imageFile) {
        fd.append("productImage", formData.imageFile);
      } else if (formData.productImageUrl && !formData.productImageUrl.startsWith("blob:")) {
        // Only send URL if it's not a blob URL (preview)
        fd.append("productImageUrl", formData.productImageUrl);
      }

      // Get auth token
      let authToken = "";
      try {
        authToken = localStorage.getItem("wnr_admin_token") || "";
      } catch {}

      const url = buildUrl(editing ? `/api/testimonials/admin/${editing._id}` : "/api/testimonials/admin");
      
      // Build headers - don't set Content-Type for FormData (browser will set it with boundary)
      const headers: HeadersInit = {};
      if (authToken) {
        headers["Authorization"] = `Bearer ${authToken}`;
      }
      
      const res = await fetch(url, {
        method: editing ? "PUT" : "POST",
        headers,
        body: fd,
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to save testimonial");
      }

      toast.success(editing ? "Testimonial updated" : "Testimonial created");
      setShowForm(false);
      setEditing(null);
      resetForm();
      fetchTestimonials();
    } catch (error: unknown) {
      toast.error((error as Error)?.message || "Failed to save testimonial");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this testimonial?")) return;
    try {
      await http(`/api/testimonials/admin/${id}`, {
        method: "DELETE",
      });
      toast.success("Testimonial deleted");
      fetchTestimonials();
    } catch (error: unknown) {
      toast.error((error as Error)?.message || "Failed to delete testimonial");
    }
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      // Store file for later submission with form
      setFormData((prev) => ({ ...prev, imageFile: file }));
      
      // Create preview URL
      const previewUrl = URL.createObjectURL(file);
      setFormData((prev) => ({ ...prev, productImageUrl: previewUrl }));
      toast.success("Image selected. Click Save to upload.");
    } catch (error: unknown) {
      toast.error((error as Error)?.message || "Failed to select image");
    } finally {
      setUploading(false);
    }
  }

  function resetForm() {
    setFormData({
      name: "",
      headline: "",
      quote: "",
      rating: 5,
      productImageUrl: "",
      countryCode: "",
      isActive: true,
      displayOrder: 0,
      imageFile: undefined,
    });
  }

  function startEdit(t: Testimonial) {
    setEditing(t);
    setFormData({
      name: t.name,
      headline: t.headline,
      quote: t.quote,
      rating: t.rating,
      productImageUrl: t.productImageUrl || "",
      countryCode: t.countryCode || "",
      isActive: t.isActive,
      displayOrder: t.displayOrder,
    });
    setShowForm(true);
  }

  function startNew() {
    setEditing(null);
    resetForm();
    setShowForm(true);
  }

  if (loading) {
    return (
      <div className="p-6">
        <p>Loading testimonials...</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Client Testimonials</h1>
        <button
          onClick={startNew}
          className="flex items-center gap-2 px-4 py-2 bg-[#722F37] text-white rounded-lg hover:opacity-90 transition-opacity font-medium"
        >
          <Plus className="w-4 h-4" />
          Add Testimonial
        </button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] flex flex-col">
            <div className="p-6 flex-1 overflow-y-auto">
              <h2 className="text-xl font-bold mb-4">
                {editing ? "Edit Testimonial" : "New Testimonial"}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4" id="testimonial-form">
                <div>
                  <label className="block text-sm font-medium mb-1">Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                    className="w-full border rounded px-3 py-2"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Headline *</label>
                  <input
                    type="text"
                    value={formData.headline}
                    onChange={(e) => setFormData((prev) => ({ ...prev, headline: e.target.value }))}
                    className="w-full border rounded px-3 py-2"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Quote/Review Text *</label>
                  <textarea
                    value={formData.quote}
                    onChange={(e) => setFormData((prev) => ({ ...prev, quote: e.target.value }))}
                    className="w-full border rounded px-3 py-2 h-24"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Rating (1-5) *</label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    value={formData.rating}
                    onChange={(e) => setFormData((prev) => ({ ...prev, rating: Number(e.target.value) }))}
                    className="w-full border rounded px-3 py-2"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Product Image URL (PNG)</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={formData.productImageUrl}
                      onChange={(e) => setFormData((prev) => ({ ...prev, productImageUrl: e.target.value }))}
                      className="flex-1 border rounded px-3 py-2"
                      placeholder="https://..."
                    />
                    <label className="flex items-center gap-2 px-4 py-2 border rounded cursor-pointer hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
                      <ImageIcon className="w-4 h-4" />
                      {uploading ? "Selecting..." : "Select Image"}
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/jpg,image/webp"
                        onChange={handleImageUpload}
                        className="hidden"
                        disabled={uploading}
                      />
                    </label>
                  </div>
                  {formData.productImageUrl && (
                    <div className="mt-2 w-32 h-32 relative border rounded">
                      <Image
                        src={formData.productImageUrl}
                        alt="Product preview"
                        fill
                        className="object-contain"
                        unoptimized
                        onError={(e) => {
                          // If preview fails, clear it
                          const target = e.target as HTMLImageElement;
                          if (target.src.startsWith("blob:")) {
                            setFormData((prev) => ({ ...prev, productImageUrl: "" }));
                          }
                        }}
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Country Code (e.g., US, IN)</label>
                  <input
                    type="text"
                    value={formData.countryCode}
                    onChange={(e) => setFormData((prev) => ({ ...prev, countryCode: e.target.value.toUpperCase() }))}
                    className="w-full border rounded px-3 py-2"
                    maxLength={2}
                    placeholder="US"
                  />
                </div>

                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium mb-1">Display Order</label>
                    <input
                      type="number"
                      value={formData.displayOrder}
                      onChange={(e) => setFormData((prev) => ({ ...prev, displayOrder: Number(e.target.value) }))}
                      className="w-full border rounded px-3 py-2"
                    />
                  </div>
                  <div className="flex items-center gap-2 pt-6">
                    <input
                      type="checkbox"
                      id="isActive"
                      checked={formData.isActive}
                      onChange={(e) => setFormData((prev) => ({ ...prev, isActive: e.target.checked }))}
                      className="w-4 h-4"
                    />
                    <label htmlFor="isActive" className="text-sm font-medium">
                      Active
                    </label>
                  </div>
                </div>

              </form>
            </div>
            {/* Fixed Footer with Buttons */}
            <div className="border-t p-4 bg-gray-50 flex gap-2">
              <button
                type="submit"
                form="testimonial-form"
                className="flex-1 px-4 py-2 bg-[#722F37] text-white rounded-lg hover:opacity-90 font-medium"
              >
                {editing ? "Update Testimonial" : "Save Testimonial"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditing(null);
                  resetForm();
                }}
                className="px-4 py-2 border rounded-lg hover:bg-gray-100 font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Testimonials List */}
      <div className="grid gap-4">
        {testimonials.map((t) => (
          <div
            key={t._id}
            className="border rounded-lg p-4 flex items-start justify-between hover:bg-gray-50"
          >
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-semibold">{t.name}</h3>
                {t.countryCode && (
                  <span className="text-sm text-gray-500">({t.countryCode})</span>
                )}
                {!t.isActive && (
                  <span className="text-xs px-2 py-1 bg-gray-200 rounded">Inactive</span>
                )}
              </div>
              <p className="font-medium text-gray-800 mb-1">{t.headline}</p>
              <p className="text-sm text-gray-600 mb-2">{t.quote}</p>
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span>⭐ {t.rating}/5</span>
                <span>Order: {t.displayOrder}</span>
                {t.productImageUrl && (
                  <span className="flex items-center gap-1">
                    <ImageIcon className="w-3 h-3" />
                    Image
                  </span>
                )}
              </div>
            </div>
            <div className="flex gap-2 ml-4">
              <button
                onClick={() => startEdit(t)}
                className="p-2 text-blue-600 hover:bg-blue-50 rounded"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleDelete(t._id)}
                className="p-2 text-red-600 hover:bg-red-50 rounded"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
        {testimonials.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No testimonials yet. Click &quot;Add Testimonial&quot; to create one.
          </div>
        )}
      </div>
    </div>
  );
}
