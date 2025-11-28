import { Logger } from "../../common/src/cli/logger.ts";
import { getLogLevelFromArgs } from "../../common/src/cli/cli.ts";
import { WebSocketEventHandler } from "./ws/events.ts";

// Initialize logger with log level from CLI args
const logLevel = getLogLevelFromArgs();
const logger = new Logger("CLIENT", logLevel);

logger.info(`Starting client with log level: ${logger.getLevelName()}`);

// Delay connection by 1 second
await new Promise(resolve => setTimeout(resolve, 1000));

// Connect to WebSocket server
const ws = new WebSocket("ws://127.0.0.1:8000");

// Create event handler for this connection
const events = new WebSocketEventHandler(ws, logger);

ws.onopen = () => events.onOpen();
ws.onmessage = (event) => events.onMessage(event);
ws.onerror = (err) => events.onError(err);
ws.onclose = () => events.onClose();
