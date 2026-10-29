import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose | null> | null;
}

declare global {
  var mongooseCache: MongooseCache | undefined;
}

let cached = global.mongooseCache;

if (!cached) {
  cached = global.mongooseCache = { conn: null, promise: null };
}

export async function connectDB(): Promise<typeof mongoose | null> {
  if (!MONGODB_URI) {
    if (process.env.VERCEL === "1") {
      throw new Error("MONGODB_URI is required on Vercel to persist shop data.");
    }
    return null;
  }

  if (cached?.conn) {
    return cached.conn;
  }

  if (!cached?.promise) {
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 5000,
    };

    cached!.promise = mongoose.connect(MONGODB_URI, opts).then((mongooseInstance) => {
      console.log("Successfully connected to MongoDB Atlas");
      return mongooseInstance;
    }).catch((err) => {
      if (process.env.VERCEL === "1") {
        cached!.promise = null;
        throw new Error("MongoDB connection failed. Check MONGODB_URI and Atlas network access.");
      }
      console.warn("MongoDB connection failed, falling back to local JSON storage:", err.message);
      cached!.promise = null;
      return null;
    });
  }

  try {
    cached!.conn = await cached!.promise;
  } catch {
    cached!.promise = null;
    if (process.env.VERCEL === "1") {
      throw new Error("MongoDB connection failed. Check MONGODB_URI and Atlas network access.");
    }
    return null;
  }

  return cached!.conn;
}

export function isMongoConnected(): boolean {
  return mongoose.connection.readyState === 1;
}
