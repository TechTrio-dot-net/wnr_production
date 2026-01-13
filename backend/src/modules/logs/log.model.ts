import mongoose, { Schema, Document } from "mongoose";

export interface ILog extends Document {
  level: "info" | "warn" | "error" | "success";
  action: string;
  message: string;
  resourceType?: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  userId?: string;
  userEmail?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

const LogSchema = new Schema<ILog>(
  {
    level: {
      type: String,
      required: true,
      enum: ["info", "warn", "error", "success"],
    },
    action: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    resourceType: {
      type: String,
      required: false,
    },
    resourceId: {
      type: String,
      required: false,
    },
    metadata: {
      type: Schema.Types.Mixed,
      required: false,
    },
    userId: {
      type: String,
      required: false,
    },
    userEmail: {
      type: String,
      required: false,
    },
    ipAddress: {
      type: String,
      required: false,
    },
    userAgent: {
      type: String,
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
LogSchema.index({ createdAt: -1 });
LogSchema.index({ action: 1 });
LogSchema.index({ level: 1 });
LogSchema.index({ userId: 1 });

const LogModel = mongoose.models.Log || mongoose.model<ILog>("Log", LogSchema);
export default LogModel;

