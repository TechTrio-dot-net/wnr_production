import { Schema, model, Document, Types } from "mongoose";

export type ProductStatus = "active" | "inactive" | "draft";

export interface ImageInfo {
  url: string;        // Cloudinary secure_url
  public_id: string;  // Cloudinary public id (for delete/replace)
  width?: number;
  height?: number;
  format?: string;
  bytes?: number;
  alt?: string;
}

export interface ProductDoc extends Document {
  name: string;
  price: number;
  category: Types.ObjectId;
  eshopboxProductId: string;
  stock: number;
  status: ProductStatus;
  images: ImageInfo[];     // 3–5 images with metadata
  hover?: ImageInfo;       // optional hover image

  // NEW text fields (optional)
  about?: string;
  ingredients?: string;
  description?: string;
  descriptionPoints?: string[];

  createdAt: Date;
  updatedAt: Date;
}

const ImageSchema = new Schema<ImageInfo>(
  {
    url: { type: String, required: true },
    public_id: { type: String, required: true },
    width: Number,
    height: Number,
    format: String,
    bytes: Number,
    alt: String,
  },
  { _id: false }
);

const ProductSchema = new Schema<ProductDoc>(
  {
    name: { type: String, required: true, trim: true, minlength: 1 },
    price: { type: Number, required: true, min: 0 },
    eshopboxProductId: { type: String, required: true, unique: true },
    category: { type: Schema.Types.ObjectId, ref: "Category", required: true },
    stock: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ["active", "inactive", "draft"],
      default: "active",
      index: true,
    },
    images: {
      type: [ImageSchema],
      required: true,
      validate: {
        validator: (arr: unknown[]) => Array.isArray(arr) && arr.length >= 3 && arr.length <= 5,
        message: "Provide between 3 and 5 images",
      },
    },
    hover: {
      type: ImageSchema,
      required: false,
    },

    // NEW
    about: { type: String },
    ingredients: { type: String },
    description: { type: String },
    descriptionPoints: {
      type: [String],
      default: undefined,
      validate: {
        validator: (arr: unknown[]) => !arr || Array.isArray(arr),
        message: "descriptionPoints must be an array of strings",
      },
    },
  },
  { timestamps: true, collection: "products" }
);

// Indexes for optimized queries
ProductSchema.index({ name: 1, category: 1 }); // Compound index for category + name queries
ProductSchema.index({ status: 1, category: 1 }); // For filtering active products by category
ProductSchema.index({ status: 1, stock: 1 }); // For low stock alerts (status + stock queries)
ProductSchema.index({ eshopboxProductId: 1 }, { unique: true }); // Ensure unique eshopbox ID
ProductSchema.index({ createdAt: -1 }); // For sorting by newest
ProductSchema.index({ price: 1 }); // For price range queries
ProductSchema.index({ stock: 1 }); // For stock management queries
// Text index for search functionality
ProductSchema.index({ name: "text", description: "text", about: "text" });

export const Product = model<ProductDoc>("Product", ProductSchema);
