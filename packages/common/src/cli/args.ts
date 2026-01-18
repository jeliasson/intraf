/**
 * CLI argument parsing utilities
 */

import { LogLevel, parseLogLevel } from "./logger.ts";

/**
 * Parse command line arguments for log level
 * Looks for --log-level or -l flags
 */
export function getLogLevelFromArgs(args: string[] = Deno.args): LogLevel {
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--log-level" || arg === "-l") {
      const level = args[i + 1];
      if (level) {
        return parseLogLevel(level);
      }
    }
    // Also support --log-level=DEBUG format
    if (arg.startsWith("--log-level=")) {
      const level = arg.split("=")[1];
      return parseLogLevel(level);
    }
  }
  return LogLevel.INFO; // Default
}
