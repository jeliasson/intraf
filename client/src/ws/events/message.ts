import type { Logger } from "../../../../common/src/logger.ts";
import { type ClientId, isClientIdMessage } from "../../../../common/src/types.ts";
import { HEARTBEAT_PONG } from "../../../../common/src/websocket.ts";
import type { HeartbeatContext } from "../heartbeat.ts";
import { startHeartbeat, resetHeartbeatTimeout } from "../heartbeat.ts";

export interface MessageHandlerContext {
  clientId: ClientId | null;
  heartbeatContext: HeartbeatContext | null;
}

export interface MessageHandlerParams {
  event: MessageEvent;
  socket: WebSocket;
  logger: Logger;
  context: MessageHandlerContext;
}

/**
 * Handle WebSocket message event
 */
export function handleMessage({
  event,
  socket,
  logger,
  context,
}: MessageHandlerParams): void {
  // Try to parse as JSON for server messages
  try {
    const data = JSON.parse(event.data);
    if (isClientIdMessage(data)) {
      context.clientId = data.id;
      logger.info(`Assigned Client ID: ${context.clientId}`);
      // Start heartbeat after receiving ID
      socket.send("Hello from Deno!");
      context.heartbeatContext = startHeartbeat(socket, logger);
      return;
    }
  } catch {
    // Not JSON, handle as regular message
  }
  
  logger.info("Received:", event.data);
  
  // Handle pong response
  if (event.data === HEARTBEAT_PONG && context.heartbeatContext) {
    logger.debug("Received pong");
    resetHeartbeatTimeout(context.heartbeatContext);
  }
}
