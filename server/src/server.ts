import { generateClientId } from "../../common/src/websocket.ts";
import { Logger } from "../../common/src/cli/logger.ts";
import { loadConfig } from "../../common/src/config.ts";
import { WebSocketEventHandler } from "./ws/events.ts";

// Initialize temporary logger for config loading
const tempLogger = new Logger("SERVER");

// Load configuration
const config = await loadConfig("./intraf.yaml", tempLogger);

// Re-initialize logger with configured log level
const serverLogger = new Logger("SERVER", config.logLevel);

serverLogger.info(`Starting server with log level: ${serverLogger.getLevelName()}`);

Deno.serve({
  hostname: config.serverHost,
  port: config.serverPort,
  onListen: ({ hostname, port }) => {
    serverLogger.info(`Listening on http://${hostname}:${port}/`);
  },
}, (req) => {
  if (req.headers.get("upgrade") != "websocket") {
    return new Response(null, { status: 426 });
  }

  const { socket, response } = Deno.upgradeWebSocket(req);

  // Generate unique client ID upon connection
  const clientId = generateClientId();
  
  // Create a logger for this connection
  const logger = new Logger(clientId, config.logLevel);
  
  // Create event handler for this connection
  const events = new WebSocketEventHandler(socket, logger, clientId);

  socket.addEventListener("open", () => events.onOpen());
  socket.addEventListener("message", (event: MessageEvent) => events.onMessage(event));
  socket.addEventListener("close", () => events.onClose());
  socket.addEventListener("error", (err: Event) => events.onError(err));

  return response;
});
