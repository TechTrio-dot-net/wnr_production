import {
  Schema,
  model,
  models,
  type Model,
  type InferSchemaType,
} from "mongoose";

/** Maps to your existing collection: "tables" */
const AdminSchema = new Schema(
  {
    email: { type: String, required: true, lowercase: true, trim: true, unique: true },
    passwordHash: { type: String, required: true, select: true }, // <-- important
    role: { type: String, default: "admin" },
    active: { type: Boolean, default: true },
  },
  { timestamps: true, collection: "tables" }
);

export type AdminDoc = InferSchemaType<typeof AdminSchema>;

const AdminModel: Model<AdminDoc> =
  (models.Admin as Model<AdminDoc>) || model<AdminDoc>("Admin", AdminSchema);

export default AdminModel;
