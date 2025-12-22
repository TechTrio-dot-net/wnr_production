"use client";

import { useEffect, useState } from "react";
import { ReviewsList } from "./ReviewsList";
import { ReviewForm } from "./ReviewForm";
import { useUser } from "@/context/UserContext";
import { buildUrl } from "@/lib/api";
import { getAuthHeader } from "@/lib/token";

type Review = {
  _id: string;
  rating: number;
  comment: string;
  createdAt: string;
  user: {
    _id: string;
    name?: string | null;
    email?: string | null;
    avatarUrl?: string | null;
    phone?: string | null;
  };
};

type ReviewsData = {
  reviews: Review[];
  averageRating: number;
  totalReviews: number;
  ratingDistribution: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
};

type UserReview = {
  _id: string;
  rating: number;
  comment: string;
  status?: string;
} | null;

type ProductReviewsProps = {
  productId: string;
};

export function ProductReviews({ productId }: ProductReviewsProps) {
  const { user } = useUser();
  const [reviewsData, setReviewsData] = useState<ReviewsData | null>(null);
  const [userReview, setUserReview] = useState<UserReview>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingReview, setEditingReview] = useState<UserReview>(null);

  const fetchReviews = async () => {
    try {
      const res = await fetch(buildUrl(`/api/reviews/product/${productId}`));
      if (res.ok) {
        const data = await res.json();
        setReviewsData(data);
      }
    } catch (error) {
      console.error("Failed to fetch reviews:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserReview = async () => {
    if (!user) {
      setUserReview(null);
      return;
    }

    try {
      const headers = getAuthHeader();
      const res = await fetch(buildUrl(`/api/reviews/product/${productId}/my-review`), {
        headers,
      });
      
      if (res.ok) {
        const data = await res.json();
        setUserReview(data);
      } else {
        setUserReview(null);
      }
    } catch (error) {
      console.error("Failed to fetch user review:", error);
      setUserReview(null);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [productId]);

  useEffect(() => {
    fetchUserReview();
  }, [productId, user]);

  const handleReviewSuccess = () => {
    fetchReviews();
    fetchUserReview();
    setShowForm(false);
    setEditingReview(null);
  };

  const handleEditReview = () => {
    setEditingReview(userReview);
    setShowForm(true);
  };

  if (loading) {
    return (
      <div className="py-12">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4" />
          <div className="h-32 bg-gray-200 rounded" />
          <div className="h-48 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  return (
    <section className="py-8 md:py-12">
      <div className="max-w-4xl mx-auto px-4">
        <h2 className="text-2xl md:text-3xl font-bold text-[var(--wnr-berry)] mb-8">
          Customer Reviews
        </h2>

        {/* User Review Section */}
        {user && userReview && !showForm && (
          <div className="mb-8 border rounded-lg p-6 bg-blue-50/50">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Your Review</h3>
                <p className="text-sm text-gray-600">
                  Status:{" "}
                  <span className="font-medium">
                    {userReview.status === "approved"
                      ? "Approved"
                      : userReview.status === "pending"
                      ? "Pending Approval"
                      : "Rejected"}
                  </span>
                </p>
              </div>
              <button
                onClick={handleEditReview}
                className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50"
              >
                Edit Review
              </button>
            </div>
            <div className="text-gray-700 whitespace-pre-wrap">{userReview.comment}</div>
          </div>
        )}

        {/* Review Form */}
        {showForm ? (
          <div className="mb-8">
            <ReviewForm
              productId={productId}
              existingReview={editingReview || undefined}
              onSuccess={handleReviewSuccess}
              onCancel={() => {
                setShowForm(false);
                setEditingReview(null);
              }}
            />
          </div>
        ) : (
          !userReview && (
            <div className="mb-8">
              <button
                onClick={() => setShowForm(true)}
                className="px-6 py-3 bg-[var(--wnr-berry)] text-white rounded-lg hover:opacity-90 font-medium"
              >
                Write a Review
              </button>
            </div>
          )
        )}

        {/* Reviews List */}
        {reviewsData && (
          <ReviewsList
            reviews={reviewsData.reviews}
            averageRating={reviewsData.averageRating}
            totalReviews={reviewsData.totalReviews}
            ratingDistribution={reviewsData.ratingDistribution}
          />
        )}
      </div>
    </section>
  );
}
