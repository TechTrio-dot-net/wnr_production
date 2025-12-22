import mongoose, { Schema, Document } from "mongoose";

export interface TestimonialDoc extends Document {
  name: string;
  headline: string;
  quote: string;
  rating: number; // 1-5 stars
  productImageUrl?: string; // PNG image URL for product
  countryCode?: string; // e.g., "US", "IN" for flag display
  isActive: boolean;
  displayOrder: number; // For sorting
  createdAt: Date;
  updatedAt: Date;
}

const TestimonialSchema = new Schema<TestimonialDoc>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    headline: {
      type: String,
      required: true,
      trim: true,
    },
    quote: {
      type: String,
      required: true,
      trim: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
      default: 5,
    },
    productImageUrl: {
      type: String,
      trim: true,
    },
    countryCode: {
      type: String,
      trim: true,
      uppercase: true,
      maxlength: 2,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    displayOrder: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for optimized queries
TestimonialSchema.index({ isActive: 1, displayOrder: 1 }); // Active testimonials sorted
TestimonialSchema.index({ rating: -1, isActive: 1 }); // Top rated testimonials
TestimonialSchema.index({ createdAt: -1 }); // Newest testimonials

export default mongoose.models.Testimonial || mongoose.model<TestimonialDoc>("Testimonial", TestimonialSchema);
