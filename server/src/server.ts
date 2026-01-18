/**
 * Server entry point - WebSocket server with authentication support
 */

import { Logger } from "../../common/src/cli/logger.ts";
import { loadConfig } from "../../common/src/config.ts";
import { HTTP_UPGRADE_REQUIRED } from "../../common/src/constants.ts";
import { serverSchema } from "./config.ts";
import { handleConnection } from "./connection/handler.ts";

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
    return new Response(null, { status: HTTP_UPGRADE_REQUIRED });
  }

  return handleConnection(
    req,
    config.log.level,
    { enabled: config.auth.enabled, secret: config.auth.secret }
  );
});
