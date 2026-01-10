import { Schema, model, Document } from "mongoose";

export interface OfferStripDoc extends Document {
  enabled: boolean;
  text: string;
  speed?: number; // Animation speed in seconds (default: 20)
  enabled2?: boolean; // Second offer strip enabled
  text2?: string; // Second offer strip text
  speed2?: number; // Second offer strip animation speed in seconds (default: 20)
  createdAt: Date;
  updatedAt: Date;
}

const OfferStripSchema = new Schema<OfferStripDoc>(
  {
    enabled: { type: Boolean, default: false },
    text: { type: String, default: "" },
    speed: { type: Number, default: 20, min: 5, max: 60 }, // 5-60 seconds
    enabled2: { type: Boolean, default: false }, // Second offer strip enabled
    text2: { type: String, default: "" }, // Second offer strip text
    speed2: { type: Number, default: 20, min: 5, max: 60 }, // 5-60 seconds
  },
  { timestamps: true, collection: "offer_strips" }
);

export const OfferStripModel = model<OfferStripDoc>("OfferStrip", OfferStripSchema);


