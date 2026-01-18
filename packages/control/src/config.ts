/**
 * Server configuration schema
 */

import { parseLogLevel } from "@intraf/common/src/cli/logger.ts";
import { ConfigSchema } from "@intraf/common/src/config/schema.ts";

export const serverSchema = {
  server: {
    host: { default: "0.0.0.0", description: "Server host address" },
    port: { default: 8000, description: "Server port" },
    maxConnections: { default: 1000, description: "Maximum concurrent connections" },
    maxConnectionsPerIp: { default: 2, description: "Maximum connections per IP address" },
    idleTimeout: { default: 300000, description: "Idle connection timeout in milliseconds (5 minutes)" },
  },
  auth: {
    enabled: { default: false, description: "Enable JWT authentication" },
    secret: { 
      default: "change-me-in-production", 
      description: "JWT secret key for token signing/verification" 
    },
  },
  log: {
    level: { 
      default: parseLogLevel("info"),
      transform: parseLogLevel,
      description: "Log level (debug, info, warn, error, critical)",
    },
  }
} satisfies ConfigSchema;
