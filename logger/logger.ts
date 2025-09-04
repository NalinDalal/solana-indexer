import DebugLogger from "./debugLogger";
import ProductionLogger from "./productionLogger";
import dotenv from "dotenv";

dotenv.config();

// Infer NODE_ENV with proper typing
const nodeEnv = process.env.NODE_ENV ?? "development";

const logger =
  nodeEnv !== "production" ? new DebugLogger() : new ProductionLogger();

export default logger;
