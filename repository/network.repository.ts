import request from "../config/axiosInstance.js";
import { populateBody } from "../utils/index.js";
import logger from "../logger/logger.js";
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

const SOLANA_ENDPOINT = process.env.SOLANA_ENDPOINT as string;
const EXCHANGE_URL = "https://api.coingecko.com/api/v3";
const STAKE_PROGRAM_ID = "Stake11111111111111111111111111111111111111";

// ---------- Types ----------

interface EpochInfoResponse {
  result: {
    epoch: number;
  };
}

interface ProgramAccountsResponse {
  result: any[];
}

interface AccountInfoResponse {
  result: {
    value: any;
  };
}

interface SolanaPriceHistoryResponse {
  market_data: {
    current_price: {
      usd: number;
    };
  };
}

interface InflationRewardResponse {
  result: Array<{
    epoch: number;
    effectiveSlot: number;
    amount: number;
    postBalance: number;
    commission: number;
  } | null>;
}

interface BlockTimeResponse {
  result: number;
}

interface SignaturesResponse {
  result: Array<{
    signature: string;
    slot: number;
    blockTime?: number;
  }>;
}

interface TransactionResponse {
  result: {
    blockTime: number;
    meta: { fee: number };
    transaction: {
      message: {
        accountKeys: string[];
      };
    };
  };
}

// ---------- Functions ----------

/**
 * Fetch the current epoch number from the Solana network.
 */
export const fetchLatestEpoch = async (): Promise<number> => {
  try {
    const body = populateBody("getEpochInfo");
    const data: EpochInfoResponse = await request.POST(SOLANA_ENDPOINT, body);
    return data.result.epoch;
  } catch (e: any) {
    logger.error(`Failed to fetch latest epoch number: ${e.message}`);
    throw e;
  }
};

/**
 * Get the accounts associated with a given program.
 */
export const getProgramAccounts = async (
  validatorId: string,
): Promise<ProgramAccountsResponse> => {
  try {
    const params = [
      STAKE_PROGRAM_ID,
      {
        commitment: "confirmed",
        encoding: "base64",
        dataSize: 200,
        filters: [
          {
            memcmp: {
              offset: 124,
              bytes: validatorId,
            },
          },
        ],
      },
    ];
    const data: ProgramAccountsResponse = await request.POST(
      SOLANA_ENDPOINT,
      populateBody("getProgramAccounts", params),
    );
    return data;
  } catch (e: any) {
    logger.error(`Failed to fetch program accounts: ${e.message}`);
    throw e;
  }
};

/**
 * Get information about a specific account.
 */
export const getAccountInfo = async (
  pubkey: string,
): Promise<AccountInfoResponse> => {
  try {
    const data: AccountInfoResponse = await request.POST(
      SOLANA_ENDPOINT,
      populateBody("getAccountInfo", [pubkey, { encoding: "jsonParsed" }]),
    );
    return data;
  } catch (e: any) {
    logger.error(`Failed to fetch account info [${pubkey}]: ${e.message}`);
    throw e;
  }
};

/**
 * Fetch the Solana price at a specific date.
 */
export const fetchSolanaPriceAtDate = async (
  timestamp: number,
): Promise<number> => {
  try {
    const d = new Date(timestamp);
    const date = d.getUTCDate();
    const month = d.getUTCMonth() + 1;
    const year = d.getUTCFullYear();
    const dateParam = `${date}-${month}-${year}`;

    const url = `${EXCHANGE_URL}/coins/solana/history`;
    const data: SolanaPriceHistoryResponse = await request.GET(url, {
      params: { localization: false, date: dateParam },
    });
    return data.market_data.current_price.usd;
  } catch (e: any) {
    logger.error(`Failed to fetch Solana price: ${e.message}`);
    throw e;
  }
};

/**
 * Fetch the inflation rewards of delegators for a specific epoch.
 */
export const getInflationReward = async (
  delegatorPubKeys: string[],
  epoch: number,
): Promise<InflationRewardResponse> => {
  try {
    const body = populateBody("getInflationReward", [
      delegatorPubKeys,
      { epoch },
    ]);
    const data: InflationRewardResponse = await request.POST(
      SOLANA_ENDPOINT,
      body,
    );
    return data;
  } catch (e: any) {
    logger.error(
      `Failed to fetch delegator rewards for epoch: ${epoch} [${delegatorPubKeys.join(
        ", ",
      )}]: ${e.message}`,
    );
    throw e;
  }
};

/**
 * Fetch the block time of a given effective slot.
 */
export const getBlockTime = async (
  effectiveSlot: number,
): Promise<number | undefined> => {
  try {
    const body = populateBody("getBlockTime", [effectiveSlot]);
    const { result }: BlockTimeResponse = await request.POST(
      SOLANA_ENDPOINT,
      body,
    );
    if (!result) logger.error("Block time not found");
    return result;
  } catch (e: any) {
    logger.error(`Failed to fetch block time: ${e.message}`);
    throw e;
  }
};

/**
 * Fetch transaction signatures related to an address.
 */
export const getSignaturesForAddress = async (
  address: string,
): Promise<SignaturesResponse> => {
  try {
    const body = populateBody("getSignaturesForAddress", [address]);
    const data: SignaturesResponse = await request.POST(SOLANA_ENDPOINT, body);
    return data;
  } catch (e: any) {
    logger.error(
      `Failed to fetch transaction signatures [${address}]: ${e.message}`,
    );
    throw e;
  }
};

/**
 * Fetch details of a transaction by its signature.
 */
export const getTransaction = async (
  signature: string,
): Promise<TransactionResponse> => {
  try {
    const body = populateBody("getTransaction", [signature, "json"]);
    const data: TransactionResponse = await request.POST(SOLANA_ENDPOINT, body);
    return data;
  } catch (e: any) {
    logger.error(
      `Failed to fetch transaction details [${signature}]: ${e.message}`,
    );
    throw e;
  }
};
