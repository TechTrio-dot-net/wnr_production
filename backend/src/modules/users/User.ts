import mongoose, { Schema, InferSchemaType, Model } from "mongoose";

const AddressSchema = new Schema(
  {
    // NEW: label for address tag
    label: { type: String, enum: ["Home", "Work", "Other"], default: "Home" },
    line1: { type: String, trim: true },
    line2: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },   // store STATE CODE (e.g., "GJ")
    pincode: { type: String, trim: true }, // keep as 6-digit string "560001"
  },
  { _id: false }
);

const UserSchema = new Schema(
  {
    phone: { type: String, required: true, unique: true, index: true },
    name: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    avatarUrl: { type: String, trim: true },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    isProfileComplete: { type: Boolean, default: false },
    provider: { type: String, default: "firebase-phone" },
    meta: {
      city: { type: String, trim: true },
      dob: { type: String, trim: true },
    },
    lastLoginAt: { type: Date, default: null },
    addresses: { type: [AddressSchema], default: [] },
  },
  { timestamps: true }
);

// Unique only when email is a non-empty string
UserSchema.index(
  { email: 1 },
  {
    unique: true,
    partialFilterExpression: {
      email: { $exists: true, $type: "string", $gt: "" },
    },
  }
);

// Guard: never persist empty/blank email
UserSchema.pre("save", function (this: any, next) {
  if (!this.email || String(this.email).trim() === "") {
    this.email = undefined;
  }
  next();
});

export type UserDoc = InferSchemaType<typeof UserSchema> & { _id: mongoose.Types.ObjectId };

const UserModel: Model<UserDoc> =
  (mongoose.models.User as Model<UserDoc>) || mongoose.model<UserDoc>("User", UserSchema);

export default UserModel;
