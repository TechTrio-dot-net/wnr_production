"use client";

import { useState } from "react";
import { StarRating } from "./StarRating";
import { useUser } from "@/context/UserContext";
import { buildUrl } from "@/lib/api";
import { getAuthHeader } from "@/lib/token";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

type ReviewFormProps = {
  productId: string;
  existingReview?: {
    _id: string;
    rating: number;
    comment: string;
  } | null;
  onSuccess?: () => void;
  onCancel?: () => void;
};

export function ReviewForm({ productId, existingReview, onSuccess, onCancel }: ReviewFormProps) {
  const { user } = useUser();
  const router = useRouter();
  const [rating, setRating] = useState(existingReview?.rating || 0);
  const [comment, setComment] = useState(existingReview?.comment || "");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error("Please login to submit a review");
      router.push(`/login?returnTo=${encodeURIComponent(window.location.pathname)}`);
      return;
    }

    if (rating === 0) {
      toast.error("Please select a rating");
      return;
    }

    if (!comment.trim()) {
      toast.error("Please write a comment");
      return;
    }

    if (comment.trim().length > 1000) {
      toast.error("Comment must be 1000 characters or less");
      return;
    }

    setSubmitting(true);

    try {
      const url = existingReview
        ? buildUrl(`/api/reviews/${existingReview._id}`)
        : buildUrl(`/api/reviews/product/${productId}`);
      
      const method = existingReview ? "PUT" : "POST";

      const headers = {
        ...getAuthHeader(),
        "Content-Type": "application/json",
      };

      const res = await fetch(url, {
        method,
        headers,
        body: JSON.stringify({ rating, comment: comment.trim() }),
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: "Failed to submit review" }));
        throw new Error(error.error || "Failed to submit review");
      }

      toast.success(
        existingReview
          ? "Review updated successfully! It will be reviewed by admin."
          : "Review submitted successfully! It will be reviewed by admin."
      );
      
      setRating(0);
      setComment("");
      onSuccess?.();
    } catch (error: any) {
      toast.error(error.message || "Failed to submit review");
    } finally {
      setSubmitting(false);
    }
  };

  if (!user && !existingReview) {
    return (
      <div className="border rounded-lg p-6 text-center">
        <p className="text-gray-600 mb-4">Please login to write a review</p>
        <button
          onClick={() => router.push(`/login?returnTo=${encodeURIComponent(window.location.pathname)}`)}
          className="px-4 py-2 bg-[var(--wnr-berry)] text-white rounded-lg hover:opacity-90"
        >
          Login
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="border rounded-lg p-6 space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Your Rating <span className="text-red-500">*</span>
        </label>
        <StarRating rating={rating} onRatingChange={setRating} />
        {rating === 0 && (
          <p className="text-sm text-gray-500 mt-1">Please select a rating</p>
        )}
      </div>

      <div>
        <label htmlFor="comment" className="block text-sm font-medium text-gray-700 mb-2">
          Your Review <span className="text-red-500">*</span>
        </label>
        <textarea
          id="comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Share your thoughts about this product..."
          rows={5}
          maxLength={1000}
          className="w-full border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-[var(--wnr-berry)] resize-none"
          required
        />
        <p className="text-sm text-gray-500 mt-1">
          {comment.length}/1000 characters
        </p>
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={submitting || rating === 0 || !comment.trim()}
          className="flex-1 px-4 py-2 bg-[var(--wnr-berry)] text-white rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting
            ? "Submitting..."
            : existingReview
            ? "Update Review"
            : "Submit Review"}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
