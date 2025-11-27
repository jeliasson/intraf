import type { Logger } from "../../../../common/src/logger.ts";
import { HEARTBEAT_PING, HEARTBEAT_PONG } from "../../../../common/src/websocket.ts";
import type { HeartbeatContext } from "../heartbeat.ts";
import { updateHeartbeat } from "../heartbeat.ts";

export interface MessageHandlerParams {
  event: MessageEvent;
  socket: WebSocket;
  logger: Logger;
  heartbeatContext: HeartbeatContext;
}

/**
 * Handle WebSocket message event
 */
export function handleMessage({
  event,
  socket,
  logger,
  heartbeatContext,
}: MessageHandlerParams): void {
  if (event.data === HEARTBEAT_PING) {
    logger.debug("Received ping, sending pong");
    updateHeartbeat(heartbeatContext);
    socket.send(HEARTBEAT_PONG);
  }
}
