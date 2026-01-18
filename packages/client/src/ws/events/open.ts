import type { Logger } from "@intraf/common/src/cli/logger.ts";

export interface OpenHandlerParams {
  logger: Logger;
}

/**
 * Handle WebSocket open event
 */
export function handleOpen({ logger }: OpenHandlerParams): void {
  logger.info("Connected! Waiting for server to assign ID...");
}
