import mongoose, { Schema } from "mongoose";

type CounterDoc = {
  _id: string;   // e.g. "order"
  seq: number;   // current sequence value
  updatedAt: Date;
};

const CounterSchema = new Schema<CounterDoc>({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
  updatedAt: { type: Date, default: Date.now },
});

// ✅ no manual index here
const Counter =
  (mongoose.models.Counter as mongoose.Model<CounterDoc>) ||
  mongoose.model<CounterDoc>("Counter", CounterSchema);

export default Counter;

/** Atomically increments and returns the next sequence value */
export async function nextSequence(key: string): Promise<number> {
  const doc = await Counter.findOneAndUpdate(
    { _id: key },
    { $inc: { seq: 1 }, $set: { updatedAt: new Date() } },
    { upsert: true, new: true }
  ).lean();
  return doc!.seq;
}
