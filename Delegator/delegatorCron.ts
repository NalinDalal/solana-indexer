import Delegator from "../models/Delegator";
import schedule, { Job } from "node-schedule";
import { fetchLatestEpoch } from "../repository/network.repository";
import { findAPRValue, findDelegators } from "../utils";
import { createDelegateTransaction } from "./utils";
import logger from "../logger/logger";
import Transaction from "../models/Transaction";

/**
 * Shape of a delegator returned from `findDelegators()`.
 */
interface NetworkDelegator {
  pubkey: string;
  activationEpoch: number;
  deactivationEpoch: number;
  stake: number;
}

/**
 * Scheduled job to manage delegators.
 */
const delegatorCron = async (): Promise<Job> => {
  logger.info("Delegator cron started");

  // Schedule a job to run every 30 minutes
  return schedule.scheduleJob("*/30 * * * *", async () => {
    await delegatorJob();
  });
};

/**
 * Job to create new delegators and update already populated ones.
 */
const delegatorJob = async (): Promise<void> => {
  try {
    const delegators: NetworkDelegator[] = await findDelegators();
    const latestEpoch: number = await fetchLatestEpoch();

    console.table(delegators);

    // Loop over each delegator and create or update their entry
    for (const delegator of delegators) {
      await processDelegator(delegator, latestEpoch);
    }
    await processUnstaking(delegators, latestEpoch);

    logger.info("Delegator cron job successfully executed");
  } catch (e: any) {
    logger.error(
      `Delegator cron job failed [${Date.now()}]: ${e.message ?? e}`,
    );
  }
};

/**
 * Process individual delegator.
 */
const processDelegator = async (
  delegator: NetworkDelegator,
  latestEpoch: number,
): Promise<void> => {
  const { pubkey, activationEpoch, deactivationEpoch, stake } = delegator;

  const storedDelegator = await Delegator.findOne({ delegatorId: pubkey });

  if (!storedDelegator) {
    const unstaked = latestEpoch >= deactivationEpoch;
    const apr = unstaked ? 0 : await findAPRValue(pubkey, latestEpoch);

    await Delegator.create({
      delegatorId: pubkey,
      timestamp: Date.now(),
      unstaked,
      apr,
      stakedAmount: stake,
      activationEpoch,
      unstakedEpoch: deactivationEpoch,
    });

    logger.info(`Created delegator: ${pubkey}`);
    await createDelegateTransaction(pubkey, stake);
    return;
  }

  if (!(await Transaction.findOne({ delegatorId: pubkey }))) {
    await createDelegateTransaction(pubkey, stake);
  }

  if (latestEpoch > deactivationEpoch) {
    if (
      storedDelegator.unstaked &&
      storedDelegator.unstakedEpoch === deactivationEpoch
    ) {
      return;
    }
    storedDelegator.unstaked = true;
    storedDelegator.unstakedEpoch = deactivationEpoch;
    await storedDelegator.save();

    logger.info(`Unstaked delegator: ${pubkey}`);
    return;
  }

  const apr = await findAPRValue(pubkey, latestEpoch);
  storedDelegator.apr = apr;
  await storedDelegator.save();
  logger.info(`APR updated for delegator: ${pubkey}`);
};

/**
 * Handle unstaking based on epoch conditions.
 */
const processUnstaking = async (
  delegators: NetworkDelegator[],
  latestEpoch: number,
): Promise<void> => {
  const delegatorPubKeys = delegators.map((delegator) => delegator.pubkey);

  await Delegator.updateMany(
    { delegatorId: { $nin: delegatorPubKeys } },
    {
      unstaked: true,
      unstakedTimestamp: Date.now(),
      unstakedEpoch: latestEpoch - 1,
    },
  );

  logger.info("Unstaking processed for delegators removed from the API");
};

export default delegatorCron;
