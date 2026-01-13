import { Schema, model, Types } from "mongoose";

const ShipmentSchema = new Schema({
  userId: { type: Types.ObjectId, ref: "User", index: true, default: null },
  orderId: { type: Types.ObjectId, ref: "Order", index: true, default: null },
  orderNumber: { type: String, index: true, required: true },
  shipmentId: { type: String, unique: true, required: true }, // SHIP_<OrderNumber>
  provider: { type: String, required: true, default: "eshopbox", index: true },
  status: { type: String, enum: ["created","label_generated","cancelled","error"], required: true },
  request: { type: Schema.Types.Mixed, required: true },
  response: { type: Schema.Types.Mixed, default: null },
  error: {
    code: { type: Number, default: null },
    message: { type: String, default: null },
  },
  meta: {
    courierName: { type: String, default: null },
    trackingId: { type: String, default: null },
    labelUrl: { type: String, default: null },
    shippingMode: { type: String, default: null },
  },
  postedAt: { type: Date, default: Date.now },
}, { timestamps: true });

export default model("Shipment", ShipmentSchema);
