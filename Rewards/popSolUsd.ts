import { Reward, IReward } from "../models/Reward";
import { setTimestampFormat } from "../utils/index.js";
import schedule, { Job } from "node-schedule";
import {
  getBlockTime,
  fetchLatestEpoch,
  getInflationReward,
  fetchSolanaPriceAtDate,
} from "../repository/network.repository.js";
import logger from "../logger/logger.js";
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

const LAMPORTS_PER_SOL = 1_000_000_000;

const VALIDATOR_PUB_KEY: string = process.env.VALIDATOR_PUB_KEY || "";
const VALIDATOR_ID: string = process.env.VALIDATOR_ID || "";
const START_EPOCH: number = parseInt(process.env.START_EPOCH || "0", 10);

interface InflationReward {
  effectiveSlot: number;
  amount: number;
  postBalance: number;
  epoch: number;
}

/**
 * Initializes the function for rewards cron job.
 * @returns {Promise<Job>} - A scheduled job to run every day at 1am.
 */
const validatorRewardsCron = async (): Promise<Job> => {
  logger.info("Validator rewards cron started");

  // Schedule a daily job to run at 1am
  return schedule.scheduleJob("0 1 * * *", async () => {
    await validatorRewardsJob();
  });
};

/**
 * Job to populate validator rewards from the start epoch to the latest epoch
 */
const validatorRewardsJob = async (): Promise<void> => {
  try {
    // Get the latest validator reward's epoch number
    const latestReward: IReward | null = await Reward.findFirst({
      where: { delegatorId: VALIDATOR_ID },
      orderBy: [{ epochNum: "desc" }, { timestamp: "desc" }],
    });

    // Set initial epoch to the epoch where validator became active
    let currentEpoch: number = START_EPOCH;
    if (latestReward) {
      currentEpoch = latestReward.epochNum + 1;
    }

    // Get the latest epoch info
    const latestEpoch: number = await fetchLatestEpoch();

    // Loop through all epochs starting from the current one
    for (; currentEpoch <= latestEpoch; currentEpoch++) {
      if (latestEpoch === currentEpoch) {
        logger.info(`Reached latest Epoch: ${latestEpoch}`);
        break;
      }

      // Fetch the validator's reward for the specific epoch
      const data = await getInflationReward([VALIDATOR_PUB_KEY], currentEpoch);
      const rewards: InflationReward | null = data.result[0] || null;

      if (rewards) {
        await processReward(rewards, currentEpoch);
      } else {
        logger.info(`no rewards for epoch: ${currentEpoch}`);
      }
    }
  } catch (e: any) {
    logger.error(`Validator rewards cron job failed: ${e.message}`);
  }
};

/**
 * Processes reward information and stores it in the database.
 */
const processReward = async (
  rewards: InflationReward,
  epoch: number,
): Promise<void> => {
  const blockTime: number = await getBlockTime(rewards.effectiveSlot);
  const timestamp: number = setTimestampFormat(
    new Date(blockTime * 1000), // convert to milliseconds
  );
  const solUsd: number = await fetchSolanaPriceAtDate(timestamp);

  const { postBalance } = rewards;
  const postBalanceUsd: number = (postBalance / LAMPORTS_PER_SOL) * solUsd;

  const reward: number = rewards.amount;
  const rewardUsd: number = (rewards.amount / LAMPORTS_PER_SOL) * solUsd;

  let totalReward: number = rewards.amount;
  let pendingRewards: number = rewards.amount;

  // Get the previous reward
  const previousReward: IReward | null = await Reward.findFirst({
    where: { delegatorId: VALIDATOR_ID },
    orderBy: { timestamp: "desc" },
  });

  if (previousReward) {
    totalReward += previousReward.totalReward;
    pendingRewards += previousReward.pendingRewards;
  }

  const totalRewardUsd: number = (totalReward / LAMPORTS_PER_SOL) * solUsd;
  const pendingRewardsUsd: number =
    (pendingRewards / LAMPORTS_PER_SOL) * solUsd;

  await Reward.create({
    data: {
      delegatorId: VALIDATOR_ID,
      epochNum: rewards.epoch,
      solUsd,
      timestamp,
      postBalance,
      postBalanceUsd,
      userAction: "REWARD",
      reward,
      rewardUsd,
      totalReward,
      totalRewardUsd,
      pendingRewards,
      pendingRewardsUsd,
      stakedAmount: -1,
      stakedAmountUsd: -1,
    },
  });

  logger.info(`processed reward for epoch [${epoch}]`);
};

export default validatorRewardsCron;
