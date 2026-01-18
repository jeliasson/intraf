/**
 * WebSocket connection handler
 */

import { generateClientId } from "../../../common/src/websocket.ts";
import { Logger, LogLevel } from "../../../common/src/cli/logger.ts";
import { WebSocketEventHandler } from "../ws/events.ts";

export interface AuthConfig {
  enabled: boolean;
  secret: string;
}

/**
 * Handle incoming WebSocket connection request
 */
export function handleConnection(
  req: Request,
  logLevel: LogLevel,
  authConfig: AuthConfig
): Response {
  const { socket, response } = Deno.upgradeWebSocket(req);

  // Generate unique client ID upon connection
  const clientId = generateClientId();
  
  // Create a logger for this connection
  const logger = new Logger(clientId, logLevel);
  
  // Create event handler for this connection
  const events = new WebSocketEventHandler(
    socket, 
    logger, 
    clientId,
    authConfig
  );

  socket.addEventListener("open", () => events.onOpen());
  socket.addEventListener("message", (event: MessageEvent) => void events.onMessage(event));
  socket.addEventListener("close", () => events.onClose());
  socket.addEventListener("error", (err: Event) => events.onError(err));

  return response;
}
