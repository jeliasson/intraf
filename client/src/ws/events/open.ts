import type { Logger } from "../../../../common/src/logger.ts";

export interface OpenHandlerParams {
  logger: Logger;
}

/**
 * Handle WebSocket open event
 */
export function handleOpen({ logger }: OpenHandlerParams): void {
  logger.info("Connected! Waiting for server to assign ID...");
}
