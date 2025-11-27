import type { Logger } from "../../../common/src/logger.ts";
import {
  HEARTBEAT_CHECK_INTERVAL,
  SERVER_HEARTBEAT_TIMEOUT,
} from "../../../common/src/websocket.ts";

export interface HeartbeatContext {
  lastHeartbeat: number;
  intervalId: number;
}

/**
 * Start monitoring heartbeat for a WebSocket connection
 */
export function startHeartbeat(
  socket: WebSocket,
  logger: Logger,
): HeartbeatContext {
  const context: HeartbeatContext = {
    lastHeartbeat: Date.now(),
    intervalId: 0,
  };

  context.intervalId = setInterval(() => {
    const timeSinceLastHeartbeat = Date.now() - context.lastHeartbeat;
    if (timeSinceLastHeartbeat > SERVER_HEARTBEAT_TIMEOUT) {
      logger.warn("Client heartbeat timeout, closing connection");
      stopHeartbeat(context);
      socket.close();
    }
  }, HEARTBEAT_CHECK_INTERVAL);

  return context;
}

/**
 * Stop monitoring heartbeat
 */
export function stopHeartbeat(context: HeartbeatContext): void {
  if (context.intervalId) {
    clearInterval(context.intervalId);
    context.intervalId = 0;
  }
}

/**
 * Update heartbeat timestamp (call when receiving ping)
 */
export function updateHeartbeat(context: HeartbeatContext): void {
  context.lastHeartbeat = Date.now();
}
