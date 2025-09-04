import { Transaction } from "../models/Transaction";
import logger from "../logger/logger";
import {
  fetchSolanaPriceAtDate,
  getTransaction,
  getSignaturesForAddress,
} from "../repository/network.repository";

const VALIDATOR_PUB_KEY: string | undefined = process.env.VALIDATOR_PUB_KEY;
const LAMPORTS_PER_SOL = 1_000_000_000;

/**
 * Create and persist a delegate transaction.
 * @param address - The delegator's public key.
 * @param stakedAmount - The amount of SOL the user staked.
 */
export const createDelegateTransaction = async (
  address: string,
  stakedAmount: number,
): Promise<void> => {
  try {
    const data = await getSignaturesForAddress(address);
    const transactionSignatures: { signature: string }[] = data.result ?? [];

    for (const signature of transactionSignatures) {
      const transactionData = await getTransaction(signature.signature);
      if (!transactionData.result) continue;

      const { transaction, meta, blockTime } = transactionData.result;

      // Check if validator participated in this tx
      const result = transaction.message.accountKeys.filter(
        (key: string) => key === VALIDATOR_PUB_KEY,
      );

      if (result.length > 0 && blockTime) {
        const solUsd: number = await fetchSolanaPriceAtDate(blockTime * 1000);
        const transactionFee: number = (meta.fee ?? 0) / LAMPORTS_PER_SOL;

        await Transaction.create({
          data: {
            delegatorId: address,
            timestamp: blockTime * 1000,
            type: "STAKE",
            amount: stakedAmount,
            solUsd,
            fee: transactionFee,
            transactionHash: signature.signature,
            transactionCount: transactionSignatures.length,
          },
        });

        logger.info(`Transaction created [${address}]`);
      }
    }
  } catch (e: any) {
    logger.error(
      `Error creating delegate transaction [${address}]: ${e.message}`,
    );
  }
};
