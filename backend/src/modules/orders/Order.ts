import mongoose, { Schema, Types, HydratedDocument, Model } from "mongoose";

export type OrderItem = {
  product: Types.ObjectId;
  name: string;
  price: number; // final price after discount
  originalPrice?: number; // original price before discount
  discountPercentage?: number; // discount percentage applied (0-100)
  discountAmount?: number; // discount amount
  qty: number;
};

export interface OrderDoc extends mongoose.Document {
  user: Types.ObjectId;
  /** human-friendly sequential number like WNR_0001 */
  orderNumber: string;
  /** raw sequence for indexing/sorting (1,2,3,...) */
  orderSeq: number;

  items: OrderItem[];
  subtotal: number;
  shipping: number;
  total: number;
  status: "pending" | "paid" | "failed" | "cancelled";
  deliverySpeed?: "standard" | "express" | "prime"; // Delivery speed option
  coupon?: {
    code: string;
    name: string;
    discountType: "percentage" | "fixed";
    discountValue: number;
    discountAmount: number;
  };
  addressSnapshot: {
    name?: string | null;
    phone?: string | null;
    line1: string;
    line2?: string | null;
    city: string;
    state: string;
    pincode: string;
  };
  payment: {
    method: "razorpay" | "cod";
    status: "unpaid" | "paid" | "failed";
    razorpayOrderId?: string;
    razorpayPaymentId?: string;
  };

  /** Shipment tracking info (Eshopbox integration) */
  shipment?: {
    eshopboxShipmentId?: string;
    courierName?: string;
    trackingId?: string;
    labelUrl?: string;
    routingCode?: string;
    shippingMode?: string;
    gstin?: string;
    transporterID?: string;
    status?: string; // Eshopbox tracking status (e.g., "DELIVERED", "INTRANSIT", etc.)
    latest_status?: string;
    status_updated_at?: string;
    statusDescription?: string;
    statusCategory?: "pending" | "in-transit" | "delivered" | "issue";
    raw?: any;
    createdAt?: Date;
    updatedAt?: Date;
  };

  placedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const OrderItemSchema = new Schema<OrderItem>(
  {
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true, min: 0 }, // final price after discount
    originalPrice: { type: Number, min: 0 },
    discountPercentage: { type: Number, min: 0, max: 100 },
    discountAmount: { type: Number, min: 0 },
    qty: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

/* 🧾 Shipment Subschema (Eshopbox label/tracking info) */
const ShipmentSubSchema = new Schema(
  {
    eshopboxShipmentId: String,
    courierName: String,
    trackingId: String,
    labelUrl: String,
    routingCode: String,
    shippingMode: String,
    gstin: String,
    transporterID: String,
    status: String, // Eshopbox tracking status (e.g., "DELIVERED", "INTRANSIT", "PICKED_UP", etc.)
    latest_status: String,
    status_updated_at: String,
    statusDescription: String,
    statusCategory: {
      type: String,
      enum: ["pending", "in-transit", "delivered", "issue"],
    },
    raw: Schema.Types.Mixed,
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const OrderSchema = new Schema<OrderDoc>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", index: true, required: true },

    orderNumber: { type: String, required: true, unique: true, index: true }, // e.g. WNR_0001
    orderSeq: { type: Number, required: true, unique: true, index: true }, // e.g. 1

    items: { type: [OrderItemSchema], required: true },
    subtotal: { type: Number, required: true },
    shipping: { type: Number, required: true },
    total: { type: Number, required: true },
    status: {
      type: String,
      enum: ["pending", "paid", "failed", "cancelled"],
      default: "pending",
    },
    deliverySpeed: {
      type: String,
      enum: ["standard", "express", "prime"],
      default: "standard",
    },
    coupon: {
      code: String,
      name: String,
      discountType: { type: String, enum: ["percentage", "fixed"] },
      discountValue: Number,
      discountAmount: Number,
    },
    addressSnapshot: {
      name: String,
      phone: String,
      line1: { type: String, required: true },
      line2: String,
      city: { type: String, required: true },
      state: { type: String, required: true },
      pincode: { type: String, required: true },
    },
    payment: {
      method: { type: String, enum: ["razorpay", "cod"], default: "razorpay" },
      status: { type: String, enum: ["unpaid", "paid", "failed"], default: "unpaid" },
      razorpayOrderId: String,
      razorpayPaymentId: String,
    },
    placedAt: { type: Date },

    /** ✅ Added shipment block */
    shipment: { type: ShipmentSubSchema },
  },
  { timestamps: true }
);

/* 🧠 Performance indexes - Optimized for MongoDB Atlas */
OrderSchema.index({ user: 1, createdAt: -1 }); // User's order history
OrderSchema.index({ user: 1, status: 1, createdAt: -1 }); // User orders by status
OrderSchema.index({ "payment.razorpayOrderId": 1 }, { unique: true, sparse: true }); // Payment lookup
OrderSchema.index({ "payment.razorpayPaymentId": 1 }, { unique: true, sparse: true }); // Payment lookup
OrderSchema.index({ status: 1, createdAt: -1 }); // Admin order listing by status
OrderSchema.index({ createdAt: -1 }); // General sorting
OrderSchema.index({ orderNumber: 1 }, { unique: true }); // Order number lookup
OrderSchema.index({ orderSeq: 1 }, { unique: true }); // Sequence lookup
OrderSchema.index({ "shipment.trackingId": 1 }); // Tracking lookup
OrderSchema.index({ "shipment.eshopboxShipmentId": 1 }); // Eshopbox shipment lookup
OrderSchema.index({ placedAt: -1 }); // For date-based queries

export type OrderHydrated = HydratedDocument<OrderDoc>;

const OrderModel: Model<OrderDoc> =
  (mongoose.models.Order as Model<OrderDoc>) ||
  mongoose.model<OrderDoc>("Order", OrderSchema);

export default OrderModel;
