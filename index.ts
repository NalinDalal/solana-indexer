import { connectDB } from "./config/db";
import delegatorCron from "./Delegator/delegatorCron";
import rewardsCron from "./Rewards";
import validatorRewardsCron from "./Rewards/validator";
import logger from "./logger/logger";

/**
 * Initialize and run essential services.
 */
const cronHandles: { cancel: () => Promise<void> }[] = [];

const main = async (): Promise<void> => {
  try {
    // Connect to the database
    await connectDB();

    // Start necessary cron jobs
    cronHandles.push(await delegatorCron());
    cronHandles.push(await validatorRewardsCron());
    cronHandles.push(await rewardsCron());
  } catch (e) {
    logger.error(`Error in main initialization: ${e}`);
  }
};

main();

process.on("SIGINT", async () => {
  try {
    for (const handle of cronHandles) {
      await handle.cancel();
      logger.info("Cron job successfully cancelled.");
    }
    process.exit(0);
  } catch (e) {
    logger.error(`Error during graceful shutdown: ${e}`);
    process.exit(1);
  }
});

