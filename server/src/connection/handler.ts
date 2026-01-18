/**
 * WebSocket connection handler
 */

import { generateClientId } from "../../../common/src/websocket.ts";
import { Logger, LogLevel } from "../../../common/src/cli/logger.ts";
import { WebSocketEventHandler } from "../ws/events.ts";
import type { ConnectionPool } from "./pool.ts";

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
  authConfig: AuthConfig,
  pool: ConnectionPool,
  clientIp: string
): Response {
  const { socket, response } = Deno.upgradeWebSocket(req);

  // Generate unique client ID upon connection
  const clientId = generateClientId();
  
  // Create a logger for this connection
  const logger = new Logger(clientId, logLevel);
  
  // Add to connection pool on open
  socket.addEventListener("open", () => {
    const rejection = pool.add({
      clientId,
      socket,
      ipAddress: clientIp,
      connectedAt: new Date(),
      lastActivity: new Date(),
      authenticated: false,
    });

    if (rejection) {
      // This shouldn't happen since we check canAccept() before upgrading
      // but handle it defensively
      logger.error(`Failed to add connection to pool: ${rejection}, closing`);
      socket.close(1008, "Pool rejection");
      return;
    }
  });

  // Remove from pool on close
  socket.addEventListener("close", () => {
    pool.remove(clientId);
  });
  
  // Create event handler for this connection
  const events = new WebSocketEventHandler(
    socket, 
    logger, 
    clientId,
    authConfig,
    pool
  );

  socket.addEventListener("open", () => events.onOpen());
  socket.addEventListener("message", (event: MessageEvent) => {
    // Update activity timestamp on every message
    pool.updateActivity(clientId);
    void events.onMessage(event);
  });
  socket.addEventListener("close", () => events.onClose());
  socket.addEventListener("error", (err: Event) => events.onError(err));

  return response;
}
