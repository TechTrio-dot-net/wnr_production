import { Schema, model, Document } from "mongoose";

export interface IngredientsStripDoc extends Document {
  enabled: boolean;
  text: string;
  speed?: number; // Animation speed in seconds (default: 20)
  createdAt: Date;
  updatedAt: Date;
}

const IngredientsStripSchema = new Schema<IngredientsStripDoc>(
  {
    enabled: { type: Boolean, default: false },
    text: { type: String, default: "" },
    speed: { type: Number, default: 20, min: 5, max: 60 }, // 5-60 seconds
  },
  { timestamps: true, collection: "ingredients_strips" }
);

export const IngredientsStripModel = model<IngredientsStripDoc>("IngredientsStrip", IngredientsStripSchema);

