import { Schema, model, Document } from "mongoose";

export interface CategoryDoc extends Document {
  name: string;
  order?: number;
  createdAt: Date;
  updatedAt: Date;
}

const CategorySchema = new Schema<CategoryDoc>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 1,
    },
    order: {
      type: Number,
      default: 0,
      index: true,
    },
  },
  { timestamps: true, collection: "categories" }
);

// Ensure a unique index on name
CategorySchema.index({ name: 1 }, { unique: true });

export const Category = model<CategoryDoc>("Category", CategorySchema)