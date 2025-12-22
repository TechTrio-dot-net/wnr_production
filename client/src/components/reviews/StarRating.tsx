"use client";

import { useState } from "react";
import { Star } from "lucide-react";

type StarRatingProps = {
  rating: number;
  onRatingChange?: (rating: number) => void;
  readonly?: boolean;
  size?: number;
};

export function StarRating({ rating, onRatingChange, readonly = false, size = 20 }: StarRatingProps) {
  const [hoverRating, setHoverRating] = useState(0);

  const handleClick = (value: number) => {
    if (readonly || !onRatingChange) return;
    onRatingChange(value);
  };

  const handleMouseEnter = (value: number) => {
    if (readonly) return;
    setHoverRating(value);
  };

  const handleMouseLeave = () => {
    if (readonly) return;
    setHoverRating(0);
  };

  const displayRating = hoverRating || rating;

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((value) => (
        <button
          key={value}
          type="button"
          onClick={() => handleClick(value)}
          onMouseEnter={() => handleMouseEnter(value)}
          onMouseLeave={handleMouseLeave}
          disabled={readonly || !onRatingChange}
          className={`transition-all ${
            readonly || !onRatingChange ? "cursor-default" : "cursor-pointer hover:scale-110"
          }`}
          aria-label={`Rate ${value} out of 5 stars`}
        >
          <Star
            size={size}
            className={`${
              value <= displayRating
                ? "fill-yellow-400 text-yellow-400"
                : "fill-gray-200 text-gray-200"
            } transition-colors`}
          />
        </button>
      ))}
    </div>
  );
}
