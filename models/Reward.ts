import mongoose, { Schema, Document, Model } from "mongoose";
import logger from "../logger/logger";

// 1. Define an interface for the Reward document
export interface IReward extends Document {
  delegatorId: string;
  solUsd: number;
  epochNum: number;
  timestamp: number;
  postBalance: number;
  postBalanceUsd: number;
  userAction?: "WITHDRAW" | "REWARD";
  reward: number;
  rewardUsd: number;
  totalReward: number;
  totalRewardUsd: number;
  pendingRewards: number;
  pendingRewardsUsd: number;
  stakedAmount: number;
  stakedAmountUsd: number;
}

// 2. Create the schema
const rewardSchema = new Schema<IReward>({
  delegatorId: {
    type: String,
    required: [true, "Delegator ID is required."],
  },
  solUsd: {
    type: Number,
    default: 0,
  },
  epochNum: {
    type: Number,
    required: [true, "Epoch number is required."],
  },
  timestamp: {
    type: Number,
    required: [true, "Timestamp is required."],
  },
  postBalance: {
    type: Number,
    required: [true, "Post balance is required."],
  },
  postBalanceUsd: {
    type: Number,
    default: 0,
  },
  userAction: {
    type: String,
    enum: ["WITHDRAW", "REWARD"],
  },
  reward: {
    type: Number,
    required: [true, "Reward amount is required."],
  },
  rewardUsd: {
    type: Number,
    required: [true, "Reward amount in USD is required."],
  },
  totalReward: {
    type: Number,
    required: [true, "Total reward is required."],
  },
  totalRewardUsd: {
    type: Number,
    default: 0,
  },
  pendingRewards: {
    type: Number,
    required: [true, "Pending rewards are required."],
  },
  pendingRewardsUsd: {
    type: Number,
    default: 0,
  },
  stakedAmount: {
    type: Number,
    required: [true, "Staked amount is required."],
  },
  stakedAmountUsd: {
    type: Number,
    required: [true, "Staked amount in USD is required."],
  },
});

// 3. Compile the schema into a model (avoid recompilation in dev mode)
const Reward: Model<IReward> =
  mongoose.models.Reward || mongoose.model<IReward>("Reward", rewardSchema);

export default Reward;
