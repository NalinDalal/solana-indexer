import { PrismaClient, Delegator as PrismaDelegator } from "@prisma/client";

const prisma = new PrismaClient();

export type IDelegator = PrismaDelegator;
export const Delegator = prisma.delegator;
