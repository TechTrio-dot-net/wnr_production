// src/modules/inbox/model.ts
import mongoose, { Schema, Document, Model } from "mongoose";
import { ReasonOption } from "./types";

export interface ContactMessageAttrs {
  name: string;
  email: string;
  phone?: string | null;
  subject?: string | null;
  message: string;
  reason: ReasonOption;
  interests: string[];
  meta?: {
    userAgent?: string;
    referer?: string;
    ip?: string;
  };
  messageHash?: string; // for dedupe

  // NEW
  confirmedAt?: Date | null;
  internalNote?: string | null;
  /** status lifecycle:
   *  new (created) -> seen (confirmed in UI) -> replied (resolved in UI) -> archived
   */
  status?: "new" | "seen" | "replied" | "archived";
}

export interface ContactMessageDoc extends Document, ContactMessageAttrs {
  createdAt: Date;
  updatedAt: Date;
}

type ContactMessageModel = Model<ContactMessageDoc>;

const ContactMessageSchema = new Schema<ContactMessageDoc, ContactMessageModel>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, default: null },
    subject: { type: String, default: null },
    message: { type: String, required: true },
    reason: {
      type: String,
      required: true,
      enum: ["Orders", "Product question", "Gifting / Corporate", "Collabs / Events", "Feedback"],
    },
    interests: { type: [String], default: [] },
    meta: {
      userAgent: { type: String },
      referer: { type: String },
      ip: { type: String },
    },
    messageHash: { type: String },

    // NEW fields
    confirmedAt: { type: Date, default: null },
    internalNote: { type: String, default: null },

    // EXTENDED enum
    status: { type: String, enum: ["new", "seen", "replied", "archived"], default: "new" },
  },
  { timestamps: true, collection: "contact_messages" }
);

// helpful indexes
ContactMessageSchema.index({ createdAt: -1 });
ContactMessageSchema.index({ email: 1, messageHash: 1, createdAt: -1 });

export const ContactMessage =
  (mongoose.models.ContactMessage as ContactMessageModel) ||
  mongoose.model<ContactMessageDoc, ContactMessageModel>("ContactMessage", ContactMessageSchema);
