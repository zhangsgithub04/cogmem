import { MongoClient, type Db } from "mongodb";

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || "memory_analysis_lab";

type CachedMongo = {
  client?: MongoClient;
  promise?: Promise<MongoClient>;
};

const globalForMongo = globalThis as typeof globalThis & {
  __memoryLabMongo?: CachedMongo;
};

const cached = globalForMongo.__memoryLabMongo || {};
globalForMongo.__memoryLabMongo = cached;

export async function getDb(): Promise<Db> {
  if (!uri) {
    throw new Error("MONGODB_URI is required. Copy .env.example to .env.local and set your MongoDB connection string.");
  }

  if (!cached.promise) {
    cached.client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
    cached.promise = cached.client.connect();
  }

  const client = await cached.promise;
  const db = client.db(dbName);
  await ensureIndexes(db);
  return db;
}

let indexesReady = false;

async function ensureIndexes(db: Db) {
  if (indexesReady) return;
  await Promise.all([
    db.collection("memory_reports").createIndex({ createdAt: -1 }),
    db.collection("memory_reports").createIndex({ participantCode: 1, createdAt: -1 }),
    db.collection("memory_reports").createIndex({ title: "text", narrative: "text" })
  ]);
  indexesReady = true;
}
