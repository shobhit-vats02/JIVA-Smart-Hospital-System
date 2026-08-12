import mongoose from 'mongoose';
import { env } from './env.js';

/**
 * Establishes the MongoDB connection using Mongoose.
 * Returns the connected mongoose instance.
 */
export async function connectDB() {
  if (mongoose.connection.readyState === 1) {
    return mongoose;
  }

  mongoose.set('strictQuery', true);

  await mongoose.connect(env.mongoUri, {
    serverSelectionTimeoutMS: 15000,
  });

  console.log(`[DB] Connected to MongoDB: ${mongoose.connection.host}`);
  return mongoose;
}

/**
 * Gracefully disconnects from MongoDB.
 */
export async function disconnectDB() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
    console.log('[DB] Disconnected from MongoDB');
  }
}
