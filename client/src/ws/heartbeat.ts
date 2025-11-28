import type { Logger } from "../../../common/src/cli/logger.ts";
import {
  HEARTBEAT_INTERVAL,
  HEARTBEAT_TIMEOUT,
  HEARTBEAT_PING,
} from "../../../common/src/websocket.ts";

export interface HeartbeatContext {
  intervalId: number;
  timeoutId: number;
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
    intervalId: 0,
    timeoutId: 0,
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
  if (context.intervalId) {
    clearInterval(context.intervalId);
    context.intervalId = 0;
  }
  if (context.timeoutId) {
    clearTimeout(context.timeoutId);
    context.timeoutId = 0;
  }
}

/**
 * Reset heartbeat timeout (call when receiving pong)
 */
export function resetHeartbeatTimeout(context: HeartbeatContext): void {
  context.awaitingPong = false;
  if (context.timeoutId) {
    clearTimeout(context.timeoutId);
    context.timeoutId = 0;
  }
}
