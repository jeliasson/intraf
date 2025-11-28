import type { Logger } from "../../../../common/src/cli/logger.ts";
import { MessageType, type ClientIdMessage } from "../../../../common/src/types.ts";
import type { ClientId } from "../../../../common/src/types.ts";

export interface OpenHandlerParams {
  socket: WebSocket;
  logger: Logger;
  clientId: ClientId;
}

/**
 * Handle WebSocket open event
 */
export function handleOpen({ socket, logger, clientId }: OpenHandlerParams): void {
  logger.info("Client connected");
  
  // Send the assigned client ID to the client
  const message: ClientIdMessage = {
    type: MessageType.CLIENT_ID,
    id: clientId,
  };
  socket.send(JSON.stringify(message));
}
