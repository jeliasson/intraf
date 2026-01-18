import type { Logger } from "../../../../common/src/cli/logger.ts";
import { MessageType, type ClientIdMessage, type AuthRequestMessage } from "../../../../common/src/types.ts";
import type { ClientId } from "../../../../common/src/types.ts";
import { MSG_CLIENT_CONNECTED } from "../../../../common/src/constants.ts";
import type { AuthContext } from "../events.ts";

export interface OpenHandlerParams {
  socket: WebSocket;
  logger: Logger;
  clientId: ClientId;
  authContext: AuthContext;
}

/**
 * Handle WebSocket open event
 */
export function handleOpen({ socket, logger, clientId, authContext }: OpenHandlerParams): void {
  logger.info(MSG_CLIENT_CONNECTED);
  
  // Send the assigned client ID to the client
  const clientIdMessage: ClientIdMessage = {
    type: MessageType.CLIENT_ID,
    id: clientId,
  };
  socket.send(JSON.stringify(clientIdMessage));

  // If authentication is enabled, send auth request
  if (authContext.enabled) {
    logger.debug("Requesting authentication");
    const authRequest: AuthRequestMessage = {
      type: MessageType.AUTH_REQUEST,
    };
    socket.send(JSON.stringify(authRequest));
  }
}
