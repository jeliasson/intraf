import type { Logger } from "../../../../common/src/cli/logger.ts";
import { HEARTBEAT_PING, HEARTBEAT_PONG } from "../../../../common/src/websocket.ts";
import type { HeartbeatContext } from "../heartbeat.ts";
import { updateHeartbeat } from "../heartbeat.ts";
import type { AuthContext } from "../events.ts";
import { 
  MessageType, 
  isAuthResponseMessage,
  isLoginRequestMessage,
  type AuthResultMessage,
  type LoginResponseMessage,
} from "../../../../common/src/types.ts";
import { verifyToken, createToken } from "../../../../common/src/auth.ts";

export interface MessageHandlerParams {
  event: MessageEvent;
  socket: WebSocket;
  logger: Logger;
  heartbeatContext: HeartbeatContext;
  authContext: AuthContext;
}

/**
 * Handle WebSocket message event
 */
export async function handleMessage({
  event,
  socket,
  logger,
  heartbeatContext,
  authContext,
}: MessageHandlerParams): Promise<void> {
  // Handle heartbeat ping
  if (event.data === HEARTBEAT_PING) {
    logger.debug("Received ping, sending pong");
    updateHeartbeat(heartbeatContext);
    socket.send(HEARTBEAT_PONG);
    return;
  }

  // Try to parse as JSON for structured messages
  try {
    const data = JSON.parse(event.data);
    
    // Handle auth response
    if (isAuthResponseMessage(data)) {
      logger.debug("Received auth response");
      
      let authSuccess = false;
      let authMessage = "Authentication required";
      let shouldCloseConnection = false;

      if (data.token) {
        const payload = await verifyToken(data.token, authContext.secret);
        if (payload) {
          authSuccess = true;
          authMessage = "Authentication successful";
          authContext.authenticated = true;
          logger.info(`Client authenticated (sub: ${payload.sub})`);
        } else {
          authMessage = "Invalid or expired token";
          shouldCloseConnection = true; // Close if invalid token provided
          logger.warn("Authentication failed: invalid token");
        }
      } else {
        // No token provided - allow them to attempt login
        authMessage = "No token provided, please login";
        shouldCloseConnection = false; // Don't close - wait for login attempt
        logger.debug("No token provided, waiting for login request");
      }

      // Send auth result
      const authResult: AuthResultMessage = {
        type: MessageType.AUTH_RESULT,
        success: authSuccess,
        status: authSuccess ? 200 : 401,
        message: authMessage,
      };
      socket.send(JSON.stringify(authResult));

      // Only close connection if invalid token was provided (not null)
      if (shouldCloseConnection && authContext.enabled) {
        logger.warn("Closing connection due to invalid authentication token");
        socket.close(1008, "Authentication failed");
      }
      return;
    }

    // Handle login request
    if (isLoginRequestMessage(data)) {
      logger.debug(`Received login request for username: ${data.username}`);
      
      // For now, accept any username/password (always correct as requested)
      // In production, validate against a database or auth service
      const loginSuccess = true; // Always succeed for now
      
      if (loginSuccess) {
        // Generate JWT token for the user
        const token = await createToken(data.username, authContext.secret);
        
        logger.info(`Login successful for user: ${data.username}`);
        authContext.authenticated = true;
        
        // Send success response with token
        const loginResponse: LoginResponseMessage = {
          type: MessageType.LOGIN_RESPONSE,
          success: true,
          token: token,
          message: "Login successful",
        };
        socket.send(JSON.stringify(loginResponse));
      } else {
        // Send failure response
        const loginResponse: LoginResponseMessage = {
          type: MessageType.LOGIN_RESPONSE,
          success: false,
          message: "Invalid username or password",
        };
        socket.send(JSON.stringify(loginResponse));
        
        // Close connection after failed login
        logger.warn("Closing connection due to failed login");
        socket.close(1008, "Login failed");
      }
      return;
    }
  } catch {
    // Not JSON or parsing failed, ignore
  }
}
