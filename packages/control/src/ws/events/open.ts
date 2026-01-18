import type { Logger } from "@intraf/common/src/cli/logger.ts";
import { MessageType, type ClientIdMessage } from "@intraf/common/src/types/messages.ts";
import type { ClientId } from "@intraf/common/src/types/messages.ts";
import { MSG_CLIENT_CONNECTED } from "@intraf/common/src/constants.ts";
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

  // If authentication is enabled, send auth status
  if (authContext.enabled) {
    logger.debug("Authentication is enabled");
    const authStatus = {
      type: "auth_status",
      statusCode: 200,
      message: "Authentication enabled but not yet implemented",
    };
    socket.send(JSON.stringify(authStatus));
  } else {
    // Send simple auth success for now
    const authStatus = {
      type: "auth_status",
      statusCode: 200,
      message: "Authentication disabled",
    };
    socket.send(JSON.stringify(authStatus));
  }
}
