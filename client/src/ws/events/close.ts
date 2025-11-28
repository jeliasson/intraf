import type { Logger } from "../../../../common/src/cli/logger.ts";
import type { HeartbeatContext } from "../heartbeat.ts";
import { stopHeartbeat } from "../heartbeat.ts";

export interface CloseHandlerParams {
  logger: Logger;
  heartbeatContext: HeartbeatContext | null;
}

/**
 * Handle WebSocket close event
 */
export function handleClose({ logger, heartbeatContext }: CloseHandlerParams): void {
  logger.info("Connection closed.");
  if (heartbeatContext) {
    stopHeartbeat(heartbeatContext);
  }
}
