import { Schema, model, Document } from "mongoose";

export type ContentType =
  | "homepage_hero"
  | "homepage_brand_promise"
  | "homepage_benefits"
  | "about_page"
  | "contact_info"
  | "faq"
  | "terms"
  | "privacy"
  | "custom";

export interface ContentDoc extends Document {
  type: ContentType;
  key: string; // Unique identifier for this content piece (e.g., "hero_title", "contact_email")
  title?: string;
  content: string | Record<string, unknown>; // Can be string or structured JSON
  metadata?: Record<string, unknown>; // Additional data (images, links, etc.)
  isActive: boolean;
  order?: number; // For ordering content items of the same type
  createdAt: Date;
  updatedAt: Date;
}

const ContentSchema = new Schema<ContentDoc>(
  {
    type: {
      type: String,
      enum: [
        "homepage_hero",
        "homepage_brand_promise",
        "homepage_benefits",
        "about_page",
        "contact_info",
        "faq",
        "terms",
        "privacy",
        "custom",
      ],
      required: true,
      index: true,
    },
    key: {
      type: String,
      required: true,
      index: true,
    },
    title: {
      type: String,
    },
    content: {
      type: Schema.Types.Mixed,
      required: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    collection: "cms_content",
  }
);

// Compound index for type + key uniqueness
ContentSchema.index({ type: 1, key: 1 }, { unique: true });
ContentSchema.index({ type: 1, isActive: 1, order: 1 });

export const Content = model<ContentDoc>("Content", ContentSchema);
