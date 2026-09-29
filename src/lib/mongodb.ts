/**
 * MongoDB singleton client for Next.js.
 * SERVER-SIDE ONLY. Never import from client components.
 *
 * Uses a global cache to prevent multiple connections during Next.js
 * hot-reload in development.
 */

import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

// In development, use a global variable so the value is preserved
// across module reloads caused by Hot Module Replacement.
declare global {
  var __mongooseCache: MongooseCache | undefined;
}

const cache: MongooseCache = global.__mongooseCache ?? {
  conn: null,
  promise: null,
};

if (process.env.NODE_ENV === 'development') {
  global.__mongooseCache = cache;
}

/**
 * Connect to MongoDB Atlas. Returns the existing connection if already connected.
 * Throws a descriptive error if MONGODB_URI is not set.
 */
export async function connectToDatabase(): Promise<typeof mongoose> {
  if (cache.conn) {
    return cache.conn;
  }

  if (!MONGODB_URI) {
    throw new Error(
      '[mongodb] MONGODB_URI environment variable is not set. ' +
        'Add it to .env.local (see .env.example).'
    );
  }

  if (!cache.promise) {
    const opts: mongoose.ConnectOptions = {
      bufferCommands: false,
    };

    console.info('[mongodb] Connecting to MongoDB Atlas...');
    cache.promise = mongoose.connect(MONGODB_URI, opts).then((mongooseInstance) => {
      console.info('[mongodb] Connected successfully.');
      return mongooseInstance;
    });
  }

  try {
    cache.conn = await cache.promise;
  } catch (error) {
    cache.promise = null;
    throw error;
  }

  return cache.conn;
}

/**
 * Check if MongoDB is reachable without throwing.
 */
export async function checkMongoHealth(): Promise<{
  ok: boolean;
  status: string;
  error?: string;
}> {
  try {
    await connectToDatabase();
    const state = mongoose.connection.readyState;
    const stateMap: Record<number, string> = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting',
    };
    return {
      ok: state === 1,
      status: stateMap[state] ?? 'unknown',
    };
  } catch (error) {
    return {
      ok: false,
      status: 'error',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
