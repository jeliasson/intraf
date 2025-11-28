import { generateClientId } from "../../common/src/websocket.ts";
import { Logger, parseLogLevel } from "../../common/src/cli/logger.ts";
import { loadConfig, ConfigSchema } from "../../common/src/config.ts";
import { WebSocketEventHandler } from "./ws/events.ts";

// Define server configuration schema
const serverSchema = {
  server: {
    host: { default: "0.0.0.0", description: "Server host address" },
    port: { default: 8000, description: "Server port" },
  },
  log: {
    level: { 
      default: parseLogLevel("info"),
      transform: parseLogLevel,
      description: "Log level (debug, info, warn, error, critical)",
    },
  }
} satisfies ConfigSchema;

// Initialize temporary logger for config loading
const tempLogger = new Logger("SERVER");

// Load configuration with server schema
const config = await loadConfig(serverSchema, "./intraf.yaml", "INTRAF", tempLogger);

// Re-initialize logger with configured log level
const serverLogger = new Logger("SERVER", config.log.level);

serverLogger.info(`Starting server with log level: ${serverLogger.getLevelName()}`);

Deno.serve({
  hostname: config.server.host,
  port: config.server.port,
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
  const logger = new Logger(clientId, config.log.level);
  
  // Create event handler for this connection
  const events = new WebSocketEventHandler(socket, logger, clientId);

  socket.addEventListener("open", () => events.onOpen());
  socket.addEventListener("message", (event: MessageEvent) => events.onMessage(event));
  socket.addEventListener("close", () => events.onClose());
  socket.addEventListener("error", (err: Event) => events.onError(err));

  return response;
});
