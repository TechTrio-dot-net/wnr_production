"use client";

import React, { useEffect, useState, useMemo } from "react";
import Image from "next/image";
import { Search, Check, X, Trash2, Star } from "lucide-react";
import { http } from "@/lib/api";
import { toast } from "sonner";

type Review = {
  _id: string;
  rating: number;
  comment: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  product: {
    _id: string;
    name: string;
    images?: Array<{ url?: string } | string>;
  };
  user: {
    _id: string;
    name?: string | null;
    email?: string | null;
    phone?: string | null;
  };
};

type ReviewsResponse = {
  reviews: Review[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
};

type StatusFilter = "all" | "pending" | "approved" | "rejected";

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [productFilter] = useState<string>("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  });

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") {
        params.append("status", statusFilter);
      }
      if (productFilter) {
        params.append("productId", productFilter);
      }
      params.append("page", page.toString());
      params.append("limit", "20");

      const data = await http<ReviewsResponse>(`/api/reviews/admin/all?${params.toString()}`);
      setReviews(data.reviews || []);
      setPagination(data.pagination || pagination);
    } catch (error: unknown) {
      toast.error((error as Error)?.message || "Failed to load reviews");
      setReviews([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, page, productFilter]);

  const handleStatusChange = async (reviewId: string, newStatus: "approved" | "rejected") => {
    try {
      await http(`/api/reviews/admin/${reviewId}/status`, {
        method: "PUT",
        body: JSON.stringify({ status: newStatus }),
      });
      toast.success(`Review ${newStatus === "approved" ? "approved" : "rejected"}`);
      fetchReviews();
    } catch (error: unknown) {
      toast.error((error as Error)?.message || "Failed to update review status");
    }
  };

  const handleDelete = async (reviewId: string) => {
    if (!confirm("Are you sure you want to delete this review?")) return;

    try {
      await http(`/api/reviews/admin/${reviewId}`, {
        method: "DELETE",
      });
      toast.success("Review deleted");
      fetchReviews();
    } catch (error: unknown) {
      toast.error((error as Error)?.message || "Failed to delete review");
    }
  };

  const filteredReviews = useMemo(() => {
    if (!searchQuery) return reviews;

    const query = searchQuery.toLowerCase();
    return reviews.filter(
      (review) =>
        review.comment.toLowerCase().includes(query) ||
        review.product.name.toLowerCase().includes(query) ||
        review.user.name?.toLowerCase().includes(query) ||
        review.user.email?.toLowerCase().includes(query)
    );
  }, [reviews, searchQuery]);

  const getProductImage = (product: Review["product"]) => {
    if (!product.images || product.images.length === 0) return "/product-placeholder.png";
    const first = product.images[0];
    if (typeof first === "string") return first;
    return first?.url || "/product-placeholder.png";
  };

  const getUserDisplayName = (user: Review["user"]) => {
    if (user.name) return user.name;
    if (user.email) return user.email.split("@")[0];
    if (user.phone) return user.phone;
    return "Anonymous";
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((value) => (
          <Star
            key={value}
            size={16}
            className={`${
              value <= rating
                ? "fill-yellow-400 text-yellow-400"
                : "fill-gray-200 text-gray-200"
            }`}
          />
        ))}
        <span className="ml-1 text-sm text-gray-600">({rating})</span>
      </div>
    );
  };

  const statusCounts = useMemo(() => {
    return {
      all: reviews.length,
      pending: reviews.filter((r) => r.status === "pending").length,
      approved: reviews.filter((r) => r.status === "approved").length,
      rejected: reviews.filter((r) => r.status === "rejected").length,
    };
  }, [reviews]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reviews Management</h1>
          <p className="text-sm text-gray-600 mt-1">Manage and moderate customer reviews</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        {/* Status Filter */}
        <div className="flex gap-2 flex-wrap">
          {(["all", "pending", "approved", "rejected"] as StatusFilter[]).map((status) => (
            <button
              key={status}
              onClick={() => {
                setStatusFilter(status);
                setPage(1);
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === status
                  ? "bg-[var(--wnr-berry)] text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)} ({statusCounts[status]})
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search reviews..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--wnr-berry)]"
            />
          </div>
        </div>
      </div>

      {/* Reviews List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="border rounded-lg p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/4 mb-4" />
              <div className="h-4 bg-gray-200 rounded w-full mb-2" />
              <div className="h-4 bg-gray-200 rounded w-3/4" />
            </div>
          ))}
        </div>
      ) : filteredReviews.length === 0 ? (
        <div className="text-center py-12 border rounded-lg">
          <p className="text-gray-600">No reviews found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredReviews.map((review) => (
            <div
              key={review._id}
              className="border rounded-lg p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex gap-4">
                {/* Product Image */}
                <div className="flex-shrink-0">
                  <Image
                    src={getProductImage(review.product)}
                    alt={review.product.name}
                    width={80}
                    height={80}
                    className="rounded-lg object-cover"
                  />
                </div>

                {/* Review Content */}
                <div className="flex-1 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900">{review.product.name}</h3>
                      <p className="text-sm text-gray-600">
                        by {getUserDisplayName(review.user)} • {formatDate(review.createdAt)}
                      </p>
                    </div>
                    <div
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        review.status === "approved"
                          ? "bg-green-100 text-green-700"
                          : review.status === "rejected"
                          ? "bg-red-100 text-red-700"
                          : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {review.status.charAt(0).toUpperCase() + review.status.slice(1)}
                    </div>
                  </div>

                  <div>{renderStars(review.rating)}</div>

                  <p className="text-gray-700 whitespace-pre-wrap">{review.comment}</p>

                  {/* Actions */}
                  {review.status === "pending" && (
                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={() => handleStatusChange(review._id, "approved")}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                      >
                        <Check size={16} />
                        Approve
                      </button>
                      <button
                        onClick={() => handleStatusChange(review._id, "rejected")}
                        className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                      >
                        <X size={16} />
                        Reject
                      </button>
                    </div>
                  )}

                  {review.status !== "pending" && (
                    <div className="flex gap-2 pt-2">
                      {review.status === "rejected" && (
                        <button
                          onClick={() => handleStatusChange(review._id, "approved")}
                          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                        >
                          <Check size={16} />
                          Approve
                        </button>
                      )}
                      {review.status === "approved" && (
                        <button
                          onClick={() => handleStatusChange(review._id, "rejected")}
                          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                        >
                          <X size={16} />
                          Reject
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(review._id)}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                      >
                        <Trash2 size={16} />
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Previous
          </button>
          <span className="text-sm text-gray-600">
            Page {pagination.page} of {pagination.pages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
            disabled={page === pagination.pages}
            className="px-4 py-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
