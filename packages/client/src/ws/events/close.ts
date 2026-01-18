import type { Logger } from "@intraf/common/src/cli/logger.ts";
import { MSG_CONNECTION_CLOSED } from "@intraf/common/src/constants.ts";
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
  logger.info(MSG_CONNECTION_CLOSED);
  if (heartbeatContext) {
    stopHeartbeat(heartbeatContext);
  }
}
