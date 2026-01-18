import type { Logger } from "../../../../common/src/cli/logger.ts";
import { MSG_CLIENT_DISCONNECTED } from "../../../../common/src/constants.ts";
import type { HeartbeatContext } from "../heartbeat.ts";
import { stopHeartbeat } from "../heartbeat.ts";

export interface CloseHandlerParams {
  logger: Logger;
  heartbeatContext: HeartbeatContext;
}

/**
 * Handle WebSocket close event
 */
export function handleClose({ logger, heartbeatContext }: CloseHandlerParams): void {
  logger.info(MSG_CLIENT_DISCONNECTED);
  stopHeartbeat(heartbeatContext);
}
