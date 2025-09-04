-- CreateTable
CREATE TABLE "public"."Delegator" (
    "id" SERIAL NOT NULL,
    "delegatorId" TEXT NOT NULL,
    "timestamp" INTEGER NOT NULL,
    "unstaked" BOOLEAN NOT NULL DEFAULT false,
    "unstakedTimestamp" INTEGER DEFAULT -1,
    "unstakedEpoch" INTEGER DEFAULT -1,
    "apr" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "stakedAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "activationEpoch" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Delegator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Reward" (
    "id" SERIAL NOT NULL,
    "delegatorId" TEXT NOT NULL,
    "solUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "epochNum" INTEGER NOT NULL,
    "timestamp" INTEGER NOT NULL,
    "postBalance" DOUBLE PRECISION NOT NULL,
    "postBalanceUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "userAction" TEXT,
    "reward" DOUBLE PRECISION NOT NULL,
    "rewardUsd" DOUBLE PRECISION NOT NULL,
    "totalReward" DOUBLE PRECISION NOT NULL,
    "totalRewardUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pendingRewards" DOUBLE PRECISION NOT NULL,
    "pendingRewardsUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "stakedAmount" DOUBLE PRECISION NOT NULL,
    "stakedAmountUsd" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "Reward_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Transaction" (
    "id" SERIAL NOT NULL,
    "delegatorId" TEXT NOT NULL,
    "timestamp" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "solUsd" DOUBLE PRECISION NOT NULL,
    "transactionCount" INTEGER NOT NULL,
    "transactionHash" TEXT NOT NULL,
    "fee" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Delegator_delegatorId_key" ON "public"."Delegator"("delegatorId");

-- CreateIndex
CREATE INDEX "Reward_delegatorId_idx" ON "public"."Reward"("delegatorId");

-- CreateIndex
CREATE INDEX "Transaction_delegatorId_idx" ON "public"."Transaction"("delegatorId");

-- AddForeignKey
ALTER TABLE "public"."Reward" ADD CONSTRAINT "Reward_delegatorId_fkey" FOREIGN KEY ("delegatorId") REFERENCES "public"."Delegator"("delegatorId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Transaction" ADD CONSTRAINT "Transaction_delegatorId_fkey" FOREIGN KEY ("delegatorId") REFERENCES "public"."Delegator"("delegatorId") ON DELETE CASCADE ON UPDATE CASCADE;
