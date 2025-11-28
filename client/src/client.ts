import { Logger } from "../../common/src/cli/logger.ts";
import { loadConfig } from "../../common/src/config.ts";
import { WebSocketEventHandler } from "./ws/events.ts";

// Initialize temporary logger for config loading
const tempLogger = new Logger("CLIENT");

// Load configuration
const config = await loadConfig("./intraf.yaml", tempLogger);

// Re-initialize logger with configured log level
const logger = new Logger("CLIENT", config.logLevel);

logger.info(`Starting client with log level: ${logger.getLevelName()}`);

// Delay connection by configured reconnect delay
await new Promise(resolve => setTimeout(resolve, config.clientReconnectDelay));

// Connect to WebSocket server
const ws = new WebSocket(config.clientServerUrl);

// Create event handler for this connection
const events = new WebSocketEventHandler(ws, logger);

ws.onopen = () => events.onOpen();
ws.onmessage = (event) => events.onMessage(event);
ws.onerror = (err) => events.onError(err);
ws.onclose = () => events.onClose();
