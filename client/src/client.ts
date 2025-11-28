import { Logger, parseLogLevel } from "../../common/src/cli/logger.ts";
import { loadConfig, ConfigSchema } from "../../common/src/config.ts";
import { WebSocketEventHandler } from "./ws/events.ts";

// Define client configuration schema
const clientSchema = {
  server: {
    host: { default: "127.0.0.1", description: "WebSocket server host" },
    port: { default: 8000, description: "WebSocket server port" },
    reconnectDelay: { default: 1000, description: "Delay before connecting (ms)" },
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
const tempLogger = new Logger("CLIENT");

// Load configuration with client schema
const config = await loadConfig(clientSchema, "./intraf.yaml", "INTRAF", tempLogger);

// Re-initialize logger with configured log level
const logger = new Logger("CLIENT", config.log.level);

logger.info(`Starting client with log level: ${logger.getLevelName()}`);

// Delay connection by configured reconnect delay
await new Promise(resolve => setTimeout(resolve, config.server.reconnectDelay));

// Connect to WebSocket server
const ws = new WebSocket(`ws://${config.server.host}:${config.server.port}`);

// Create event handler for this connection
const events = new WebSocketEventHandler(ws, logger);

ws.onopen = () => events.onOpen();
ws.onmessage = (event) => events.onMessage(event);
ws.onerror = (err) => events.onError(err);
ws.onclose = () => events.onClose();
