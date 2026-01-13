// scripts/seedAdmin.ts
import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import AdminModel from "../src/modules/admin/Admin";

async function main() {
  const { MONGODB_URI } = process.env as { MONGODB_URI?: string };
  if (!MONGODB_URI) throw new Error("MONGODB_URI not set");

  await mongoose.connect(MONGODB_URI);
  const email = "admin@wildnroot.com";
  const password = "Admin@123";
  const passwordHash = await bcrypt.hash(password, 10);

  const existing = await AdminModel.findOne({ email }).select("+passwordHash").lean();
  if (existing) {
    await AdminModel.updateOne({ email }, { $set: { passwordHash, role: "admin", active: true } });
    console.log("✅ Admin updated:", email);
  } else {
    await AdminModel.create({ email, passwordHash, role: "admin", active: true });
    console.log("✅ Admin created:", email);
  }

  await mongoose.disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
