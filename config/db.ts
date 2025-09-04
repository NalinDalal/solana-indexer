import { PrismaClient } from "@prisma/client";
import logger from "../logger/logger";

const prisma = new PrismaClient();

export const connectDB = async (): Promise<void> => {
  try {
    await prisma.$connect();
    logger.info(
      "✅ Successfully connected to the PostgreSQL database via Prisma",
    );
  } catch (e: any) {
    logger.error(`❌ Error connecting to the database: ${e.message}`);
    throw e;
  }
};
