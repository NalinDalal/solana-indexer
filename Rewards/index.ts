import { Delegator, IDelegator } from "../models/Delegator";
import { Reward, IReward } from "../models/Reward";
import { setTimestampFormat } from "../utils";
import schedule, { Job } from "node-schedule";
import {
  getBlockTime,
  fetchLatestEpoch,
  getInflationReward,
  fetchSolanaPriceAtDate,
} from "../repository/network.repository";
import logger from "../logger/logger";

/**
 * Important Notes on Delegation and Rewards:
 *
 * - Activation Epoch:
 *    The epoch when a delegation is activated.
 *
 * - Reward Beginning Epoch:
 *    Rewards start accruing one epoch after the Activation Epoch.
 *
 * - Withdrawal Implications:
 *    Upon withdrawal, the 'postBalance' will be less than the balance from the previous reward.
 *
 */

const LAMPORTS_PER_SOL = 1_000_000_000;
const START_EPOCH = parseInt(process.env.START_EPOCH || "0", 10);

// ---------------- Types ----------------
interface RewardOfDelegation {
  amount: number;
  postBalance: number;
  effectiveSlot: number;
  epoch: number;
}

interface InitializedRewardData {
  reward: number;
  rewardUsd: number;
  totalReward: number;
  totalRewardUsd: number;
  pendingRewards: number;
  pendingRewardsUsd: number;
  postBalance: number;
  postBalanceUsd: number;
  stakedAmount: number;
  stakedAmountUsd: number;
}

// ---------------- Cron ----------------

/**
 * Initializes the function for rewards cron job.
 * @returns {Promise<Job>} - A scheduled job to run every day at 1am.
 */
const rewardsCron = async (): Promise<Job> => {
  logger.info("Rewards cron started");

  // Schedule a daily job to run at 1am
  return schedule.scheduleJob("0 1 * * *", async () => {
    await rewardsJob();
  });
};

/**
 * Job to populate rewards from the start epoch to the latest epoch for all delegators
 */
const rewardsJob = async (): Promise<void> => {
  try {
    const delegators: IDelegator[] = await Delegator.findMany({
      where: { unstaked: false },
    });
    const delegatorPubKeys: string[] = delegators.map((d) => d.delegatorId);

    // finding the latest reward's epoch number
    const reward: IReward | null = await Reward.findFirst({
      where: { delegatorId: { in: delegatorPubKeys } },
      orderBy: [{ epochNum: "desc" }, { timestamp: "desc" }],
    });

    // initial epoch where validator became active
    let currentEpoch = START_EPOCH;
    if (reward !== null) {
      currentEpoch = reward.epochNum + 1;
    }
    const latestEpoch = await fetchLatestEpoch();

    for (; currentEpoch <= latestEpoch; currentEpoch++) {
      logger.info(
        `current epoch: ${currentEpoch}, latest epoch: ${latestEpoch}`,
      );
      if (currentEpoch === latestEpoch) {
        logger.info(`Reached latest Epoch: ${latestEpoch}`);
        break;
      }

      const data = await getInflationReward(delegatorPubKeys, currentEpoch);
      if (data.result && data.result.length > 0) {
        // loop through each delegator's reward
        for (let j = 0; j < data.result.length; j++) {
          const delegatorReward: RewardOfDelegation | null = data.result[j];
          if (
            !isRewardValidForEpoch(
              delegatorReward,
              currentEpoch,
              delegators[j].activationEpoch,
              delegators[j].unstakedEpoch,
            )
          )
            continue;

          const blockTime = await getBlockTime(delegatorReward!.effectiveSlot);
          const timestamp = setTimestampFormat(
            new Date((blockTime || 0) * 1000), // seconds to milliseconds
          );
          const solUsd = await fetchSolanaPriceAtDate(timestamp);

          const pubkey = delegatorPubKeys[j];

          const redundantReward = await Reward.findFirst({
            where: { delegatorId: pubkey, timestamp },
          });
          if (redundantReward) {
            await Reward.deleteMany({
              where: { delegatorId: pubkey, timestamp },
            });
          }

          // initialization of reward props
          const {
            reward,
            rewardUsd,
            totalReward,
            totalRewardUsd,
            pendingRewards,
            pendingRewardsUsd,
            postBalance,
            postBalanceUsd,
            stakedAmount,
            stakedAmountUsd,
          } = await initializeRewardData(
            pubkey,
            delegatorReward!,
            delegators[j].stakedAmount,
            solUsd,
          );
          const { epoch: epochNum } = delegatorReward!;

          await Reward.create({
            data: {
              delegatorId: pubkey,
              epochNum,
              solUsd,
              timestamp,
              userAction: "REWARD",
              reward,
              rewardUsd,
              totalReward,
              totalRewardUsd,
              pendingRewards,
              pendingRewardsUsd,
              postBalance,
              postBalanceUsd,
              stakedAmount,
              stakedAmountUsd,
            },
          });
        }
        logger.info(`processed rewards for epoch [${currentEpoch}]`);
      } else {
        logger.info(`no rewards for epoch [${currentEpoch}]`);
      }
    }
  } catch (e: any) {
    console.log(e);
    logger.error(`Rewards cron job failed: ${e.message}`);
    const lastReward = await Reward.findFirst({
      orderBy: { epochNum: "desc" },
    });
    if (lastReward) {
      const data = await Reward.deleteMany({
        where: { epochNum: lastReward.epochNum },
      });
      logger.info(`Deleted rewards for epochNum ${lastReward.epochNum}`);
      console.info(JSON.stringify(data, null, 2));
    }
  }
};

// ---------------- Helpers ----------------

/**
 * Checks if the reward is valid for the specified epoch based on activation and deactivation epochs.
 */
const isRewardValidForEpoch = (
  delegatorReward: RewardOfDelegation | null,
  epoch: number,
  activationEpoch: number,
  deactivationEpoch: number,
): boolean => {
  return (
    delegatorReward !== null &&
    epoch > activationEpoch &&
    epoch < deactivationEpoch
  );
};

/**
 * Calculates the USD value of the post balance, reward, and staked amount.
 */
const convertSolUsd = (amount: number, solUsd: number): number => {
  return (amount / LAMPORTS_PER_SOL) * solUsd;
};

/**
 * Initializes reward data for a delegator.
 */
const initializeRewardData = async (
  pubkey: string,
  delegatorReward: RewardOfDelegation,
  stakedAmount: number,
  solUsd: number,
): Promise<InitializedRewardData> => {
  const { amount: reward, postBalance } = delegatorReward;
  let totalReward = reward,
    pendingRewards = reward;

  const previousReward: IReward | null = await Reward.findOne({
    delegatorId: pubkey,
  })
    .sort({ epochNum: -1, timestamp: -1 })
    .exec();

  if (previousReward) {
    totalReward += previousReward.totalReward;
    pendingRewards += previousReward.pendingRewards;
  }

  const rewardUsd = convertSolUsd(reward, solUsd);
  const totalRewardUsd = convertSolUsd(totalReward, solUsd);
  const pendingRewardsUsd = convertSolUsd(pendingRewards, solUsd);
  const postBalanceUsd = convertSolUsd(postBalance, solUsd);
  const stakedAmountUsd = convertSolUsd(stakedAmount, solUsd);

  return {
    reward,
    rewardUsd,
    totalReward,
    totalRewardUsd,
    pendingRewards,
    pendingRewardsUsd,
    postBalance,
    postBalanceUsd,
    stakedAmount,
    stakedAmountUsd,
  };
};

export default rewardsCron;
