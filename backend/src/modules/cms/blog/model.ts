import mongoose, { Schema } from "mongoose";

export interface BlogDoc extends mongoose.Document {
  title: string;
  slug: string;
  author: string;
  excerpt: string;
  content: string;
  featuredImage?: string | null;
  tags: string[];
  status: "draft" | "published";
  showOnWebpage: boolean;
  publishedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const BlogSchema = new Schema<BlogDoc>(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, index: true },
    author: { type: String, required: true, trim: true },
    excerpt: { type: String, required: true, trim: true },
    content: { type: String, required: true },
    featuredImage: { type: String, default: null },
    tags: { type: [String], default: [] },
    status: { type: String, enum: ["draft", "published"], default: "draft", index: true },
    showOnWebpage: { type: Boolean, default: false, index: true },
    publishedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Lightweight text index (title/excerpt/content)
BlogSchema.index({ title: "text", excerpt: "text", content: "text" });

export const BlogModel =
  (mongoose.models.Blog as mongoose.Model<BlogDoc>) ||
  mongoose.model<BlogDoc>("Blog", BlogSchema);
