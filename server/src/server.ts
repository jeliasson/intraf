import {
  HEARTBEAT_CHECK_INTERVAL,
  SERVER_HEARTBEAT_TIMEOUT,
  HEARTBEAT_PING,
  HEARTBEAT_PONG,
  generateClientId,
} from "../../common/src/websocket.ts";
import {
  MessageType,
  type ClientId,
  type ClientIdMessage,
} from "../../common/src/types.ts";
import { Logger, getLogLevelFromArgs } from "../../common/src/logger.ts";

// Initialize logger with log level from CLI args
const logLevel = getLogLevelFromArgs();
const serverLogger = new Logger("SERVER", logLevel);

serverLogger.info(`Starting server with log level: ${serverLogger.getLevelName()}`);

Deno.serve((req) => {

  if (req.headers.get("upgrade") != "websocket") {
    return new Response(null, { status: 426 });
  }

  const { socket, response } = Deno.upgradeWebSocket(req);

  // Generate unique client ID upon connection
  const clientId: ClientId = generateClientId();
  
  // Create a logger for this connection
  const logger = new Logger(clientId, logLevel);
  
  // Track last heartbeat time
  let lastHeartbeat = Date.now();

  // Monitor for stale connections
  const heartbeatCheck = setInterval(() => {
    const timeSinceLastHeartbeat = Date.now() - lastHeartbeat;
    if (timeSinceLastHeartbeat > SERVER_HEARTBEAT_TIMEOUT) {
      logger.warn("Client heartbeat timeout, closing connection");
      clearInterval(heartbeatCheck);
      socket.close();
    }
  }, HEARTBEAT_CHECK_INTERVAL);

  socket.addEventListener("open", () => {
    logger.info("Client connected");
    // Send the assigned client ID to the client
    const message: ClientIdMessage = {
      type: MessageType.CLIENT_ID,
      id: clientId,
    };
    socket.send(JSON.stringify(message));
  });

  socket.addEventListener("message", (event: MessageEvent) => {
    if (event.data === HEARTBEAT_PING) {
      logger.debug("Received ping, sending pong");
      lastHeartbeat = Date.now();
      socket.send(HEARTBEAT_PONG);
    }
  });

  socket.addEventListener("close", () => {
    logger.info("Client disconnected");
    clearInterval(heartbeatCheck);
  });

  socket.addEventListener("error", (err: Event) => {
    // "Unexpected EOF" errors are normal when clients disconnect abruptly
    // The close event will handle cleanup, so we only log unexpected errors
    const errorEvent = err as ErrorEvent;
    if (errorEvent.message && errorEvent.message !== "Unexpected EOF") {
      logger.error("WebSocket error:", errorEvent.message);
    }
    // Don't clear interval here - let close event handle it to avoid double-cleanup
  });

  return response;
});
