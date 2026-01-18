/**
 * Lifecycle management - signal handlers and graceful shutdown
 */

import { Logger } from "@intraf/common/src/cli/logger.ts";
import { ReconnectingWebSocketClient } from "./connection/reconnecting-client.ts";
import { WebServer } from "./web/server.ts";

/**
 * Setup signal handlers for graceful shutdown
 */
export function setupSignalHandlers(
  client: ReconnectingWebSocketClient,
  webServer: WebServer | null,
  logger: Logger
): void {
  Deno.addSignalListener("SIGINT", async () => {
    logger.info("Received SIGINT, closing connection...");
    client.close();
    if (webServer) {
      await webServer.stop();
    }
    Deno.exit(0);
  });

  Deno.addSignalListener("SIGTERM", async () => {
    logger.info("Received SIGTERM, closing connection...");
    client.close();
    if (webServer) {
      await webServer.stop();
    }
    Deno.exit(0);
  });
}
