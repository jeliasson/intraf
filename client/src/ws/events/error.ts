import type { Logger } from "../../../../common/src/logger.ts";

export interface ErrorHandlerParams {
  err: Event | ErrorEvent;
  logger: Logger;
}

/**
 * Handle WebSocket error event
 */
export function handleError({ err, logger }: ErrorHandlerParams): void {
  logger.error("WebSocket error:", err);
}
