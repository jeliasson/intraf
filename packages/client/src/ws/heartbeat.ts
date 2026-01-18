import type { Logger } from "@intraf/common/src/cli/logger.ts";
import {
  HEARTBEAT_INTERVAL,
  HEARTBEAT_TIMEOUT,
  HEARTBEAT_PING,
} from "@intraf/common/src/constants.ts";

export interface HeartbeatContext {
  intervalId: number | undefined;
  timeoutId: number | undefined;
  awaitingPong: boolean;
}

/**
 * Start sending heartbeat pings
 */
export function startHeartbeat(
  socket: WebSocket,
  logger: Logger,
): HeartbeatContext {
  const context: HeartbeatContext = {
    intervalId: undefined,
    timeoutId: undefined,
    awaitingPong: false,
  };

  context.intervalId = setInterval(() => {
    if (context.awaitingPong) {
      logger.warn("No pong received, connection may be lost");
      socket.close();
      return;
    }
    
    logger.debug("Sending ping...");
    socket.send(HEARTBEAT_PING);
    context.awaitingPong = true;
    
    // Set timeout for pong response
    context.timeoutId = setTimeout(() => {
      if (context.awaitingPong) {
        logger.error("Heartbeat timeout - no pong received");
        socket.close();
      }
    }, HEARTBEAT_TIMEOUT);
  }, HEARTBEAT_INTERVAL);

  return context;
}

/**
 * Stop sending heartbeat pings
 */
export function stopHeartbeat(context: HeartbeatContext): void {
  if (context.intervalId !== undefined) {
    clearInterval(context.intervalId);
    context.intervalId = undefined;
  }
  if (context.timeoutId !== undefined) {
    clearTimeout(context.timeoutId);
    context.timeoutId = undefined;
  }
}

/**
 * Reset heartbeat timeout (call when receiving pong)
 */
export function resetHeartbeatTimeout(context: HeartbeatContext): void {
  context.awaitingPong = false;
  if (context.timeoutId !== undefined) {
    clearTimeout(context.timeoutId);
    context.timeoutId = undefined;
  }
}
