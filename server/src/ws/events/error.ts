import type { Logger } from "../../../../common/src/logger.ts";

export interface ErrorHandlerParams {
  err: Event;
  logger: Logger;
}

/**
 * Handle WebSocket error event
 */
export function handleError({ err, logger }: ErrorHandlerParams): void {
  // "Unexpected EOF" errors are normal when clients disconnect abruptly
  // The close event will handle cleanup, so we only log unexpected errors
  const errorEvent = err as ErrorEvent;
  if (errorEvent.message && errorEvent.message !== "Unexpected EOF") {
    logger.error("WebSocket error:", errorEvent.message);
  }
}
