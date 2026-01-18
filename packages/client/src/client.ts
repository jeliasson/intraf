/**
 * Client entry point - orchestrates connection, web server, and lifecycle
 */

import { Logger } from "@intraf/common/src/cli/logger.ts";
import { loadConfig } from "@intraf/common/src/config/loader.ts";
import { clientSchema } from "./config.ts";
import { ReconnectingWebSocketClient } from "./connection/reconnecting-client.ts";
import { WebServer } from "./web/server.ts";
import { setupSignalHandlers } from "./lifecycle.ts";

// Initialize temporary logger for config loading
const tempLogger = new Logger("CLIENT");

// Load configuration with client schema
const config = await loadConfig(clientSchema, "./intraf.yaml", "INTRAF", tempLogger);

// Re-initialize logger with configured log level
const logger = new Logger("CLIENT", config.log.level);

logger.info(`Starting client with log level: ${logger.getLevelName()}`);

// Create client instance
const client = new ReconnectingWebSocketClient(
  config.server.host,
  config.server.port,
  logger,
  config.server.reconnectEnabled,
  config.server.reconnectInterval,
  config.server.reconnectMaxAttempts,
  config.server.reconnectBackoff,
  config.server.reconnectMaxDelay,
  config.server.connectionTimeout,
);

// Start web server if enabled
let webServer: WebServer | null = null;
if (config.web.enabled) {
  const webLogger = new Logger("WEB", config.log.level);
  webServer = new WebServer(config.web.host, config.web.port, webLogger);
  webServer.start();
  client.setWebServer(webServer);
  
  // Add logger hook to broadcast logs to web clients
  Logger.addHook((level, levelName, prefix, timestamp, message) => {
    if (webServer) {
      webServer.broadcastLogEntry(levelName, prefix, timestamp, message);
    }
  });
}

// Setup signal handlers for graceful shutdown
setupSignalHandlers(client, webServer, logger);

// Initial delay before first connection
await new Promise(resolve => setTimeout(resolve, config.server.reconnectDelay));

// Start connection
client.connect();
