"use client";

import { StarRating } from "./StarRating";
import Image from "next/image";

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

type ReviewsListProps = {
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

export function ReviewsList({ reviews, averageRating, totalReviews, ratingDistribution }: ReviewsListProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getUserInitials = (name?: string | null, email?: string | null, phone?: string | null) => {
    if (name) {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    if (email) {
      return email[0].toUpperCase();
    }
    if (phone) {
      return phone.slice(-2);
    }
    return "U";
  };

  const getUserDisplayName = (name?: string | null, email?: string | null, phone?: string | null) => {
    if (name) return name;
    if (email) return email.split("@")[0];
    if (phone) return phone.slice(-4).padStart(phone.length, "X");
    return "Anonymous";
  };

  if (totalReviews === 0) {
    return (
      <div className="text-center py-12 border rounded-lg">
        <p className="text-gray-600">No reviews yet. Be the first to review this product!</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Section */}
      <div className="border rounded-lg p-6">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Average Rating */}
          <div className="flex-1">
            <div className="flex items-center gap-4 mb-4">
              <div className="text-5xl font-bold text-[var(--wnr-berry)]">{averageRating.toFixed(1)}</div>
              <div>
                <StarRating rating={Math.round(averageRating)} readonly size={28} />
                <p className="text-sm text-gray-600 mt-1">{totalReviews} {totalReviews === 1 ? "review" : "reviews"}</p>
              </div>
            </div>
          </div>

          {/* Rating Distribution */}
          <div className="flex-1 space-y-2">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = ratingDistribution[star as keyof typeof ratingDistribution];
              const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
              
              return (
                <div key={star} className="flex items-center gap-3">
                  <div className="flex items-center gap-1 w-20">
                    <span className="text-sm font-medium">{star}</span>
                    <svg className="w-4 h-4 fill-yellow-400 text-yellow-400" viewBox="0 0 24 24">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                  </div>
                  <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-yellow-400 transition-all duration-300"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="text-sm text-gray-600 w-12 text-right">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Reviews List */}
      <div className="space-y-6">
        <h3 className="text-xl font-bold text-[var(--wnr-berry)]">
          Customer Reviews ({totalReviews})
        </h3>
        
        {reviews.map((review) => (
          <div key={review._id} className="border rounded-lg p-6">
            <div className="flex items-start gap-4">
              {/* Avatar */}
              <div className="flex-shrink-0">
                {review.user.avatarUrl ? (
                  <Image
                    src={review.user.avatarUrl}
                    alt={getUserDisplayName(review.user.name, review.user.email, review.user.phone)}
                    width={48}
                    height={48}
                    className="rounded-full object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-[var(--wnr-berry)]/10 flex items-center justify-center text-[var(--wnr-berry)] font-semibold">
                    {getUserInitials(review.user.name, review.user.email, review.user.phone)}
                  </div>
                )}
              </div>

              {/* Review Content */}
              <div className="flex-1">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="font-semibold text-gray-900">
                      {getUserDisplayName(review.user.name, review.user.email, review.user.phone)}
                    </h4>
                    <p className="text-sm text-gray-500">{formatDate(review.createdAt)}</p>
                  </div>
                </div>

                <div className="mb-3">
                  <StarRating rating={review.rating} readonly size={18} />
                </div>

                <p className="text-gray-700 whitespace-pre-wrap">{review.comment}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
