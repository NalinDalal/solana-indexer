import { createLogger, format, transports, Logger } from "winston";
const { combine, timestamp, colorize } = format;
import { getFileAndLineNumber, consoleFormat, fileFormat } from "./utils";

class ProductionLogger {
  private logger: Logger;

  constructor() {
    this.logger = this.initLogger();
  }

  private initLogger(): Logger {
    return createLogger({
      level: "info",
      format: combine(
        timestamp({ format: "YYYY-MM-DD HH:mm:ss [UTC]Z" }),
        fileFormat,
      ),
      transports: [
        new transports.Console({
          format: combine(colorize(), consoleFormat),
        }),
        new transports.File({
          filename: "combined.log",
          level: "info",
        }),
        new transports.File({
          filename: "error.log",
          level: "error",
        }),
      ],
    });
  }

  public debug(message: string): void {
    const fileInfo = getFileAndLineNumber();
    this.logger.debug(message, { meta: fileInfo });
  }

  public info(message: string): void {
    const fileInfo = getFileAndLineNumber();
    this.logger.info(message, { meta: fileInfo });
  }

  public error(message: string): void {
    const fileInfo = getFileAndLineNumber();
    this.logger.error(message, { meta: fileInfo });
  }
}

export default ProductionLogger;
