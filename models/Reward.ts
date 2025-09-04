import { PrismaClient, Reward as PrismaReward } from "@prisma/client";

const prisma = new PrismaClient();

export type IReward = PrismaReward;
export const Reward = prisma.reward;
