import { MongoClient } from 'mongodb';

const uri = process.env.MONGO_URL;
const dbName = process.env.DB_NAME || 'apfa_gold_cup';

let cached = global._mongo;
if (!cached) cached = global._mongo = { client: null, db: null };

export async function getDb() {
  if (cached.db) return cached.db;
  if (!cached.client) {
    cached.client = new MongoClient(uri);
    await cached.client.connect();
  }
  cached.db = cached.client.db(dbName);
  return cached.db;
}
