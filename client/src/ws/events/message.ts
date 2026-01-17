import type { Logger } from "../../../../common/src/cli/logger.ts";
import { 
  type ClientId, 
  isClientIdMessage,
  isAuthRequestMessage,
  isAuthResultMessage,
  isLoginResponseMessage,
  MessageType,
  type AuthResponseMessage,
  type LoginRequestMessage,
} from "../../../../common/src/types.ts";
import { HEARTBEAT_PONG } from "../../../../common/src/websocket.ts";
import type { HeartbeatContext } from "../heartbeat.ts";
import { startHeartbeat, resetHeartbeatTimeout } from "../heartbeat.ts";
import { loadCredentials, saveCredentials } from "../../../../common/src/credentials.ts";
import { promptCredentials } from "../../../../common/src/prompt.ts";

export interface MessageHandlerContext {
  clientId: ClientId | null;
  heartbeatContext: HeartbeatContext | null;
  loginInProgress: boolean; // Track if we're in the middle of a login flow
}

export interface MessageHandlerParams {
  event: MessageEvent;
  socket: WebSocket;
  logger: Logger;
  context: MessageHandlerContext;
}

/**
 * Handle WebSocket message event
 */
export async function handleMessage({
  event,
  socket,
  logger,
  context,
}: MessageHandlerParams): Promise<void> {
  // Try to parse as JSON for server messages
  try {
    const data = JSON.parse(event.data);
    
    if (isClientIdMessage(data)) {
      context.clientId = data.id;
      logger.info(`Assigned Client ID: ${context.clientId}`);
      // Start heartbeat after receiving ID
      socket.send("Hello from Deno!");
      context.heartbeatContext = startHeartbeat(socket, logger);
      return;
    }

    // Handle auth request from server
    if (isAuthRequestMessage(data)) {
      logger.debug("Received auth request");
      
      // Try to load credentials
      const credentials = await loadCredentials();
      const token = credentials?.token || null;

      if (token) {
        logger.debug("Sending authentication token");
        
        // Send auth response with token
        const authResponse: AuthResponseMessage = {
          type: MessageType.AUTH_RESPONSE,
          token: token,
        };
        socket.send(JSON.stringify(authResponse));
      } else {
        logger.warn("No authentication token found, prompting for login");
        
        // Send auth response with no token first
        const authResponse: AuthResponseMessage = {
          type: MessageType.AUTH_RESPONSE,
          token: null,
        };
        socket.send(JSON.stringify(authResponse));
        
        // Mark that we're starting a login flow
        context.loginInProgress = true;
        
        // Prompt for credentials (synchronous now)
        const { username, password } = promptCredentials();
        
        // Send login request
        const loginRequest: LoginRequestMessage = {
          type: MessageType.LOGIN_REQUEST,
          username,
          password,
        };
        socket.send(JSON.stringify(loginRequest));
      }
      return;
    }

    // Handle auth result from server
    if (isAuthResultMessage(data)) {
      if (data.success) {
        logger.info(`Authentication successful (${data.status})`);
      } else {
        // Only prompt for login if we're not already in a login flow
        if (context.loginInProgress) {
          logger.debug("Auth failed but login already in progress, waiting for LOGIN_RESPONSE");
        } else {
          logger.error(`Authentication failed (${data.status}): ${data.message || 'Unknown error'}`);
          logger.warn("Token invalid or expired, prompting for login");
          
          // Mark that we're starting a login flow
          context.loginInProgress = true;
          
          // Prompt for credentials on auth failure (synchronous now)
          const { username, password } = promptCredentials();
          
          // Send login request
          const loginRequest: LoginRequestMessage = {
            type: MessageType.LOGIN_REQUEST,
            username,
            password,
          };
          socket.send(JSON.stringify(loginRequest));
        }
      }
      return;
    }

    // Handle login response from server
    if (isLoginResponseMessage(data)) {
      // Clear login in progress flag
      context.loginInProgress = false;
      
      if (data.success && data.token) {
        logger.info("Login successful! Token received and saved.");
        
        // Save token to credentials file
        await saveCredentials({ token: data.token });
        
        logger.debug("Credentials saved successfully");
      } else {
        logger.error(`Login failed: ${data.message || 'Unknown error'}`);
      }
      return;
    }
  } catch {
    // Not JSON, handle as regular message
  }
  
  logger.info("Received:", event.data);
  
  // Handle pong response
  if (event.data === HEARTBEAT_PONG && context.heartbeatContext) {
    logger.debug("Received pong");
    resetHeartbeatTimeout(context.heartbeatContext);
  }
}
