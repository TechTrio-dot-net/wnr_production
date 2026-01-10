import mongoose, { Schema, Types } from "mongoose";

export type CartItem = {
  product: Types.ObjectId;
  qty: number;
  priceAtAdd: number;  // snapshot at add time
  discountPercentageAtAdd?: number;  // discount percentage at add time (0-100)
};

export interface CartDoc extends mongoose.Document {
  user: Types.ObjectId;
  items: CartItem[];
  updatedAt: Date;
}

const CartItemSchema = new Schema<CartItem>(
  {
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    qty: { type: Number, required: true, min: 1 },
    priceAtAdd: { type: Number, required: true, min: 0 },
    discountPercentageAtAdd: { type: Number, min: 0, max: 100, default: undefined },
  },
  { _id: true }
);

const CartSchema = new Schema<CartDoc>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", unique: true, index: true, required: true },
    items: { type: [CartItemSchema], default: [] },
  },
  { timestamps: true }
);

export default (mongoose.models.Cart as mongoose.Model<CartDoc>) ||
  mongoose.model<CartDoc>("Cart", CartSchema);
