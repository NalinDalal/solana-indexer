import { PrismaClient, Transaction as PrismaTransaction } from "@prisma/client";

const prisma = new PrismaClient();

export type ITransaction = PrismaTransaction;
export const Transaction = prisma.transaction;
