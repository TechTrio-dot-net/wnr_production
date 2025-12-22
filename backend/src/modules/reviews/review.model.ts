import { Schema, model, Document, Types } from "mongoose";

export type ReviewStatus = "pending" | "approved" | "rejected";

export interface ReviewDoc extends Document {
  product: Types.ObjectId;
  user: Types.ObjectId;
  rating: number; // 1-5 stars
  comment: string;
  status: ReviewStatus;
  helpfulCount?: number;
  createdAt: Date;
  updatedAt: Date;
}

const ReviewSchema = new Schema<ReviewDoc>(
  {
    product: { 
      type: Schema.Types.ObjectId, 
      ref: "Product", 
      required: true,
      index: true,
    },
    user: { 
      type: Schema.Types.ObjectId, 
      ref: "User", 
      required: true,
      index: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
      validate: {
        validator: Number.isInteger,
        message: "Rating must be an integer between 1 and 5",
      },
    },
    comment: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },
    helpfulCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true, collection: "reviews" }
);

// Compound index to ensure one review per user per product
ReviewSchema.index({ product: 1, user: 1 }, { unique: true });

// Index for querying approved reviews by product
ReviewSchema.index({ product: 1, status: 1, createdAt: -1 });

// Index for admin queries
ReviewSchema.index({ status: 1, createdAt: -1 });

export const Review = model<ReviewDoc>("Review", ReviewSchema);
