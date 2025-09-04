import mongoose, { Mongoose } from "mongoose";
import dotenv from "dotenv";
import logger from "../logger/logger";

// Load environment variables from .env file
dotenv.config();

/**
 * Establishes a connection to MongoDB using the provided configurations.
 * Configurations are sourced from environment variables.
 *
 * @returns A Mongoose connection object once established.
 * @throws Error if the connection fails.
 */
export const connectDB = async (): Promise<Mongoose> => {
  try {
    mongoose.set("strictQuery", false);

    const connection = await mongoose.connect(
      process.env.DB_URI as string,
      {
        // ✅ These options are not needed in Mongoose 7+, but safe if you're on v6
        useNewUrlParser: true,
        useUnifiedTopology: true,
        user: process.env.MONGO_USER,
        pass: process.env.MONGO_PASSWORD,
        dbName: process.env.DB_NAME,
      } as any,
    ); // cast because `useNewUrlParser` & `useUnifiedTopology` aren’t in latest types

    logger.info("✅ Successfully connected to the database");
    return connection;
  } catch (e: any) {
    logger.error(`❌ Error connecting to the database: ${e.message}`);
    throw e;
  }
};
