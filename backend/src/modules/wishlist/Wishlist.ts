import mongoose, { Schema, Types, Model, HydratedDocument } from "mongoose";

export interface WishlistDoc extends mongoose.Document {
  user: Types.ObjectId;
  items: Types.ObjectId[]; // product ids
  createdAt: Date;
  updatedAt: Date;
}

const WishlistSchema = new Schema<WishlistDoc>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", unique: true, required: true, index: true },
    items: [{ type: Schema.Types.ObjectId, ref: "Product" }],
  },
  { timestamps: true }
);

// fast lookups
WishlistSchema.index({ user: 1 });
WishlistSchema.index({ user: 1, items: 1 });

export type WishlistHydrated = HydratedDocument<WishlistDoc>;

const WishlistModel: Model<WishlistDoc> =
  (mongoose.models.Wishlist as Model<WishlistDoc>) ||
  mongoose.model<WishlistDoc>("Wishlist", WishlistSchema);

export default WishlistModel;
