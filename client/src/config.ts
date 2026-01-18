/**
 * Client configuration schema
 */

import { parseLogLevel } from "../../common/src/cli/logger.ts";
import { ConfigSchema } from "../../common/src/config.ts";

export const clientSchema = {
  server: {
    host: { default: "127.0.0.1", description: "WebSocket server host" },
    port: { default: 8000, description: "WebSocket server port" },
    reconnectDelay: { default: 1000, description: "Initial delay before connecting (ms)" },
    reconnectEnabled: { default: true, description: "Enable automatic reconnection" },
    reconnectInterval: { default: 5000, description: "Delay between reconnection attempts (ms)" },
    reconnectMaxAttempts: { default: 0, description: "Maximum reconnection attempts (0 = infinite)" },
    reconnectBackoff: { default: true, description: "Use exponential backoff for reconnection" },
    reconnectMaxDelay: { default: 30000, description: "Maximum reconnection delay (ms)" },
    connectionTimeout: { default: 10000, description: "Connection establishment timeout (ms)" },
  },
  web: {
    enabled: { default: true, description: "Enable web dashboard server" },
    host: { default: "127.0.0.1", description: "Web dashboard host address" },
    port: { default: 3000, description: "Web dashboard port" },
  },
  log: {
    level: { 
      default: parseLogLevel("info"),
      transform: parseLogLevel,
      description: "Log level (debug, info, warn, error, critical)",
    },
  }
} satisfies ConfigSchema;
