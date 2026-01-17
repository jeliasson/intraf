import type { Logger } from "../../../../common/src/cli/logger.ts";

export interface ErrorHandlerParams {
  err: Event | ErrorEvent;
  logger: Logger;
}

/**
 * Handle WebSocket error event
 */
export function handleError({ err, logger }: ErrorHandlerParams): void {
  // Extract error message from ErrorEvent
  const errorEvent = err as ErrorEvent;
  
  if (errorEvent.message) {
    const message = errorEvent.message;
    
    // Common error patterns
    if (message.includes("failed to connect")) {
      logger.warn("Failed to connect to server");
    } else if (message.includes("Unexpected EOF")) {
      logger.debug("Connection closed by server");
    } else if (message.includes("Connection refused")) {
      logger.warn("Connection refused - server may be down");
    } else {
      // Log other errors with just the message
      logger.error(`WebSocket error: ${message}`);
    }
  } else {
    // Fallback for unknown errors
    logger.error("WebSocket error occurred");
  }
}
