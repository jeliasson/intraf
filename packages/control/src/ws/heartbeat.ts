import type { Logger } from "@intraf/common/src/cli/logger.ts";
import {
  HEARTBEAT_CHECK_INTERVAL,
  SERVER_HEARTBEAT_TIMEOUT,
} from "@intraf/common/src/constants.ts";

export interface HeartbeatContext {
  lastHeartbeat: number;
  intervalId: number | undefined;
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
    intervalId: undefined,
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
  if (context.intervalId !== undefined) {
    clearInterval(context.intervalId);
    context.intervalId = undefined;
  }
}

/**
 * Update heartbeat timestamp (call when receiving ping)
 */
export function updateHeartbeat(context: HeartbeatContext): void {
  context.lastHeartbeat = Date.now();
}
