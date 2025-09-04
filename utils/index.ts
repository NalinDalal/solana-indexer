import logger from "../logger/logger.js";
import Reward from "../models/Reward.js";
import {
  getProgramAccounts,
  getAccountInfo,
} from "../repository/network.repository.js";
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

const VALIDATOR_PUB_KEY = process.env.VALIDATOR_PUB_KEY as string;

// ---------- Types ----------

interface RewardDoc {
  delegatorId: string;
  epochNum: number;
  duplicate: boolean;
  reward: number;
  postBalance: number;
  timestamp: Date;
}

interface StakeInfo {
  pubkey: string;
  activationEpoch: number;
  deactivationEpoch: number;
  stake: number;
}

// ---------- Utils ----------

/**
 * Helper function to create a JSON-RPC request body.
 */
export const populateBody = (
  method: string,
  params: unknown[] | null = null,
) => {
  const body: Record<string, unknown> = {
    jsonrpc: "2.0",
    id: 1,
    method,
  };
  if (params) {
    body.params = params;
  }
  return body;
};

/**
 * Sets the timestamp format to UTC 00:00:00.
 */
export const setTimestampFormat = (currentDate: Date): number => {
  try {
    currentDate.setUTCHours(0, 0, 0, 0);
    return currentDate.getTime();
  } catch (e: any) {
    logger.error(`Failed to set timestamp format: ${e.message}`);
    throw e;
  }
};

/**
 * Fetches the inflation reward for a given delegatorId and epoch.
 */
const findRewards = async (
  delegatorId: string,
  epoch: number,
): Promise<{ reward: number; postBalance: number }> => {
  try {
    const data = (await Reward.findOne({
      delegatorId,
      epochNum: epoch,
      duplicate: false,
    })) as RewardDoc | null;

    if (!data) return { reward: 0, postBalance: 0 };

    const { reward, postBalance } = data;
    return { reward, postBalance };
  } catch (e: any) {
    logger.error(`Failed to fetch rewards: ${e.message}`);
    throw e;
  }
};

/**
 * Calculates and returns the APR value for a given delegator ID.
 */
export const findAPRValue = async (
  delegatorId: string,
  latestEpoch: number,
): Promise<number> => {
  try {
    const currentDate = new Date();
    const lastMonthDate = new Date(
      currentDate.setMonth(currentDate.getMonth() - 1),
    );

    const previousRewards = (await Reward.find({
      delegatorId,
      timestamp: { $gte: lastMonthDate },
    }).sort({ timestamp: 1 })) as RewardDoc[];

    if (!previousRewards.length) return 0;

    const startEpoch = previousRewards[previousRewards.length - 1].epochNum;
    const numEpochs = latestEpoch - startEpoch + 1;

    const rewards = await Promise.all(
      Array.from({ length: numEpochs }, (_, i) =>
        findRewards(delegatorId, startEpoch + i),
      ),
    );

    let totalAmount = 0;
    let totalPostBalance = 0;

    rewards.forEach((reward, index) => {
      if (index !== 0) totalAmount += reward.reward;
      if (index !== rewards.length - 1) totalPostBalance += reward.postBalance;
    });

    const apr = (totalAmount / totalPostBalance) * (numEpochs * 12) * 100;
    return isNaN(apr) ? 0 : apr;
  } catch (e: any) {
    logger.error(`Failed to calculate APR value: ${e.message}`);
    throw e;
  }
};

/**
 * Fetches stake information for a given public key.
 */
const findStakeInfo = async (
  pubkey: string,
): Promise<StakeInfo | undefined> => {
  try {
    const data = await getAccountInfo(pubkey);

    if (data && data.result) {
      const { delegation } = data.result.value.data.parsed.info.stake;
      const { activationEpoch, deactivationEpoch, stake } = delegation;
      return {
        pubkey,
        activationEpoch: parseInt(activationEpoch),
        deactivationEpoch: parseInt(deactivationEpoch),
        stake: parseFloat(stake),
      };
    }
  } catch (e: any) {
    logger.error(`Failed to fetch stake info [${pubkey}]: ${e.message}`);
    throw e;
  }
};

/**
 * Fetches and returns active delegators for a given validator.
 */
export const findDelegators = async (
  validatorId: string = VALIDATOR_PUB_KEY,
): Promise<StakeInfo[]> => {
  try {
    const data = await getProgramAccounts(validatorId);

    if (data && data.result) {
      const delegators: string[] = data.result.map(
        (obj: { pubkey: string }) => obj.pubkey,
      );
      const activeDelegatorChecks = delegators.map((delegator) =>
        findStakeInfo(delegator),
      );
      const activeDelegators = (
        await Promise.all(activeDelegatorChecks)
      ).filter((d): d is StakeInfo => Boolean(d));
      return activeDelegators;
    }
    return [];
  } catch (e: any) {
    logger.error(`Failed to retrieve program accounts: ${e.message}`);
    throw e;
  }
};
