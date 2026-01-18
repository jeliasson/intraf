/**
 * Server configuration schema
 */

import { parseLogLevel } from "../../common/src/cli/logger.ts";
import { ConfigSchema } from "../../common/src/config.ts";

export const serverSchema = {
  server: {
    host: { default: "0.0.0.0", description: "Server host address" },
    port: { default: 8000, description: "Server port" },
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
