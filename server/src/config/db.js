import mongoose from "mongoose";
import { env } from "./env.js";

/**
 * Connect to MongoDB using the configured MONGO_URI.
 * Designed to work reliably against local instances, Docker, and MongoDB Atlas.
 *
 * @param {string} [customUri] - Optional custom connection string override
 * @returns {Promise<typeof mongoose>}
 */
export const connectDB = async (customUri) => {
  if (mongoose.connection.readyState === 1) {
    return mongoose;
  }

  const uri = customUri || process.env.MONGO_URI || env.MONGO_URI;

  try {
    const conn = await mongoose.connect(uri, {
      autoIndex: true,
      serverSelectionTimeoutMS: 5000,
    });

    console.log(`🍃 Connected to MongoDB: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (error) {
    console.error(`❌ MongoDB connection error: ${error.message}`);
    throw error;
  }
};

/**
 * Cleanly close the MongoDB connection.
 *
 * @returns {Promise<void>}
 */
export const disconnectDB = async () => {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
      console.log("🍃 Disconnected from MongoDB.");
    }
  } catch (error) {
    console.error(`❌ Error disconnecting MongoDB: ${error.message}`);
  }
};

export default { connectDB, disconnectDB };

