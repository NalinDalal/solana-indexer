import * as stackTrace from "stack-trace";
import { format, Logform } from "winston";

const { printf } = format;

interface FileInfo {
  file: string;
  line: number;
}

/**
 * Extracts the file and line number of the log call using stack trace.
 */
const getFileAndLineNumber = (): FileInfo => {
  try {
    throw new Error("Dummy error to find stack trace");
  } catch (e) {
    const trace = stackTrace.parse(e as Error);
    const cwd = process.cwd().split("src")[0];

    // index 2 skips this function and its immediate caller to reach the original log call
    const file =
      trace[2].getFileName()?.replace(cwd, "").replace("file:///", "") ??
      "unknown";
    const line = trace[2].getLineNumber() ?? -1;

    return { file, line };
  }
};

/**
 * Log formatter for file-based logging.
 */
const fileFormat = printf(
  ({
    level,
    message,
    timestamp,
    meta,
  }: Logform.TransformableInfo & { meta?: FileInfo }) => {
    let fileInfo = "";
    if (meta) {
      const { file, line } = meta;
      fileInfo = `${file}:${line}`;
    }
    return `[${level}]\t[${timestamp}]\t${fileInfo}\t${message}`;
  },
);

/**
 * Log formatter for console logging.
 */
const consoleFormat = printf(
  ({
    level,
    message,
    meta,
  }: Logform.TransformableInfo & { meta?: FileInfo }) => {
    let fileInfo = "";
    if (meta) {
      const { file, line } = meta;
      fileInfo = `${file}:${line}`;
    }
    return `[${level}]\t${fileInfo}\t${message}`;
  },
);

export { getFileAndLineNumber, fileFormat, consoleFormat, FileInfo };
