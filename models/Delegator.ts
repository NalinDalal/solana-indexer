import mongoose, { Schema, Document, Model } from "mongoose";
import logger from "../logger/logger";

// 1. Define an interface for the Delegator document
export interface IDelegator extends Document {
  delegatorId: string;
  timestamp: number;
  unstaked: boolean;
  unstakedTimestamp: number;
  unstakedEpoch: number;
  apr: number;
  stakedAmount: number;
  activationEpoch: number;
}

// 2. Create the schema
const delegatorSchema = new Schema<IDelegator>({
  delegatorId: {
    type: String,
    required: [true, "Delegator ID is required"],
  },
  timestamp: {
    type: Number,
    required: [true, "Timestamp is required"],
  },
  unstaked: {
    type: Boolean,
    default: false,
  },
  unstakedTimestamp: {
    type: Number,
    default: -1,
  },
  unstakedEpoch: {
    type: Number,
    default: -1,
  },
  apr: {
    type: Number,
    default: 0,
  },
  stakedAmount: {
    type: Number,
    default: 0,
  },
  activationEpoch: {
    type: Number,
    default: 0,
  },
});

// 3. Compile the schema into a model (avoid recompilation in dev mode)
const Delegator: Model<IDelegator> =
  mongoose.models.Delegator ||
  mongoose.model<IDelegator>("Delegator", delegatorSchema);

export default Delegator;
