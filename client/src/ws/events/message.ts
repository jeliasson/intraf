import type { Logger } from "../../../../common/src/cli/logger.ts";
import { 
  type ClientId, 
  isClientIdMessage,
  MessageType,
} from "../../../../common/src/types.ts";
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
export async function handleMessage({
  event,
  socket,
  logger,
  context,
}: MessageHandlerParams): Promise<void> {
  // Try to parse as JSON for server messages
  try {
    const data = JSON.parse(event.data);
    
    if (isClientIdMessage(data)) {
      context.clientId = data.id;
      logger.info(`Assigned Client ID: ${context.clientId}`);
      // Start heartbeat after receiving ID
      context.heartbeatContext = startHeartbeat(socket, logger);
      return;
    }

    // Handle authentication response (if auth is enabled on server)
    if (data.type === "auth_status") {
      const statusCode = data.statusCode || 200;
      if (statusCode === 200) {
        logger.info(`Authentication successful (${statusCode})`);
      } else {
        logger.warn(`Authentication failed (${statusCode})`);
      }
      return;
    }
  } catch {
    // Not JSON or parsing failed - this is expected for non-JSON messages (like pong)
  }
  
  logger.info("Received:", event.data);
  
  // Handle pong response
  if (event.data === HEARTBEAT_PONG && context.heartbeatContext) {
    logger.debug("Received pong");
    resetHeartbeatTimeout(context.heartbeatContext);
  }
}
