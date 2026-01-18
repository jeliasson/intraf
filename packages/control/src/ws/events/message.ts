import type { Logger } from "@intraf/common/src/cli/logger.ts";
import { HEARTBEAT_PING, HEARTBEAT_PONG } from "@intraf/common/src/constants.ts";
import type { HeartbeatContext } from "../heartbeat.ts";
import { updateHeartbeat } from "../heartbeat.ts";
import type { AuthContext } from "../events.ts";

export interface MessageHandlerParams {
  event: MessageEvent;
  socket: WebSocket;
  logger: Logger;
  heartbeatContext: HeartbeatContext;
  authContext: AuthContext;
}

/**
 * Handle WebSocket message event
 */
export async function handleMessage({
  event,
  socket,
  logger,
  heartbeatContext,
  authContext,
}: MessageHandlerParams): Promise<void> {
  // Handle heartbeat ping
  if (event.data === HEARTBEAT_PING) {
    logger.debug("Received ping, sending pong");
    updateHeartbeat(heartbeatContext);
    socket.send(HEARTBEAT_PONG);
    return;
  }

  // Try to parse as JSON for structured messages
  try {
    const data = JSON.parse(event.data);
    
    // Handle future message types here
    logger.debug("Received message:", data);
  } catch {
    // Not JSON or parsing failed - this is expected for non-JSON messages (like ping)
  }
}
