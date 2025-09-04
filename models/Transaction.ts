import mongoose, { Schema, Document, Model } from "mongoose";
import logger from "../logger/logger";

// 1. Define an interface for the Transaction document
export interface ITransaction extends Document {
  delegatorId: string;
  timestamp: number;
  type: string;
  amount: number;
  solUsd: number;
  transactionCount: number;
  transactionHash: string;
  fee: number;
}

// 2. Create the schema
const transactionSchema = new Schema<ITransaction>({
  delegatorId: {
    type: String,
    required: [true, "Delegator ID is required."],
  },
  timestamp: {
    type: Number,
    required: [true, "Timestamp of the transaction is required."],
  },
  type: {
    type: String,
    required: [true, "Transaction type is required."],
  },
  amount: {
    type: Number,
    required: [true, "Transaction amount is required."],
  },
  solUsd: {
    type: Number,
    required: [
      true,
      "Solana price in USD at the time of transaction is required.",
    ],
  },
  transactionCount: {
    type: Number,
    required: [true, "Transaction count for the delegator is required."],
  },
  transactionHash: {
    type: String,
    required: [true, "Transaction hash is required."],
  },
  fee: {
    type: Number,
    required: [true, "Transaction fee is required."],
  },
});

// 3. Compile the schema into a model (avoid recompilation in dev mode)
const Transaction: Model<ITransaction> =
  mongoose.models.Transaction ||
  mongoose.model<ITransaction>("Transaction", transactionSchema);

export default Transaction;
