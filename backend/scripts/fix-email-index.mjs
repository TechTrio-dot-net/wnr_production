import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("Missing MONGO_URI in env");
  process.exit(1);
}

const client = new MongoClient(uri);

async function main() {
  await client.connect();

  // Pick DB from URI path or set explicitly:
  const url = new URL(uri.replace("mongodb+srv", "mongodb"));
  const dbName = url.pathname.replace(/^\//, "") || "test";
  const db = client.db(dbName);
  const col = db.collection("users");

  console.log("Connected. DB:", db.databaseName);

  // Clean bad email values
  await col.updateMany({ email: null }, { $unset: { email: "" } });
  await col.updateMany({ email: "" },   { $unset: { email: "" } });

  // Drop any existing email index
  const idx = await col.indexes();
  for (const i of idx) {
    if (i.name.startsWith("email_")) {
      try { await col.dropIndex(i.name); console.log("Dropped", i.name); } catch {}
    }
  }

  // Create partial unique index compatible with your server
  await col.createIndex(
    { email: 1 },
    {
      unique: true,
      partialFilterExpression: {
        email: { $exists: true, $type: "string", $gt: "" }
      }
    }
  );

  await col.createIndex({ phone: 1 }, { unique: true });

  console.log("✅ Done");
  console.log(await col.indexes());
  await client.close();
}

main().catch(e => { console.error(e); process.exit(1); });
