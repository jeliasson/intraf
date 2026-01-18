/**
 * Server entry point - WebSocket server with authentication support
 */

import { Logger } from "../../common/src/cli/logger.ts";
import { loadConfig } from "../../common/src/config.ts";
import { HTTP_UPGRADE_REQUIRED, HTTP_SERVICE_UNAVAILABLE } from "../../common/src/constants.ts";
import { serverSchema } from "./config.ts";
import { handleConnection } from "./connection/handler.ts";
import { ConnectionPool, RejectionReason } from "./connection/pool.ts";

// Initialize temporary logger for config loading
const tempLogger = new Logger("SERVER");

// Load configuration with server schema
const config = await loadConfig(serverSchema, "./intraf.yaml", "INTRAF", tempLogger);

// Re-initialize logger with configured log level
const serverLogger = new Logger("SERVER", config.log.level);

serverLogger.info(`Starting server with log level: ${serverLogger.getLevelName()}`);

// Create connection pool
const pool = new ConnectionPool(
  {
    maxConnections: config.server.maxConnections,
    maxConnectionsPerIp: config.server.maxConnectionsPerIp,
    enableDraining: true,
  },
  serverLogger
);

// Start idle connection cleanup interval (check every minute)
const idleCheckInterval = setInterval(() => {
  pool.closeIdleConnections(config.server.idleTimeout);
}, 60000);

// Log pool stats periodically (every 5 minutes)
const statsInterval = setInterval(() => {
  pool.logStats();
}, 300000);

// Graceful shutdown handler
const shutdown = async (signal: string) => {
  serverLogger.info(`Received ${signal}, starting graceful shutdown...`);
  
  // Clear intervals
  clearInterval(idleCheckInterval);
  clearInterval(statsInterval);
  
  // Start draining (reject new connections)
  pool.startDraining();
  
  // Close all active connections
  await pool.closeAll(1001, "Server shutting down");
  
  serverLogger.info("Graceful shutdown complete");
  Deno.exit(0);
};

// Register shutdown handlers
Deno.addSignalListener("SIGINT", () => shutdown("SIGINT"));
Deno.addSignalListener("SIGTERM", () => shutdown("SIGTERM"));

Deno.serve({
  hostname: config.server.host,
  port: config.server.port,
  onListen: ({ hostname, port }) => {
    serverLogger.info(`Listening on http://${hostname}:${port}/`);
    serverLogger.info(`Connection pool: ${config.server.maxConnections} max connections, ${config.server.maxConnectionsPerIp} per IP`);
    serverLogger.info(`Idle timeout: ${config.server.idleTimeout}ms`);
  },
}, (req) => {
  if (req.headers.get("upgrade") != "websocket") {
    return new Response(null, { status: HTTP_UPGRADE_REQUIRED });
  }

  // Extract client IP address
  const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0].trim() 
    || req.headers.get("x-real-ip")
    || "unknown";

  // Check if pool can accept new connections from this IP
  const rejection = pool.canAccept(clientIp);
  if (rejection) {
    let message: string;
    switch (rejection) {
      case RejectionReason.POOL_FULL:
        message = "Server at capacity - maximum connections reached";
        serverLogger.warn(`Connection rejected from ${clientIp}: pool full`);
        break;
      case RejectionReason.IP_LIMIT_REACHED:
        message = `Too many connections from your IP address (limit: ${config.server.maxConnectionsPerIp})`;
        serverLogger.warn(`Connection rejected from ${clientIp}: IP limit reached`);
        break;
      case RejectionReason.DRAINING:
        message = "Server is shutting down - not accepting new connections";
        serverLogger.warn(`Connection rejected from ${clientIp}: draining`);
        break;
      default:
        message = "Connection rejected";
    }
    
    return new Response(message, { status: HTTP_SERVICE_UNAVAILABLE });
  }

  return handleConnection(
    req,
    config.log.level,
    { enabled: config.auth.enabled, secret: config.auth.secret },
    pool,
    clientIp
  );
});
