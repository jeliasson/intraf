import type { Logger } from "../../../common/src/cli/logger.ts";
import type { ClientId } from "../../../common/src/types.ts";
import { handleOpen } from "./events/open.ts";
import { handleMessage } from "./events/message.ts";
import { handleClose } from "./events/close.ts";
import { handleError } from "./events/error.ts";
import type { HeartbeatContext } from "./heartbeat.ts";
import { startHeartbeat } from "./heartbeat.ts";

export interface AuthContext {
  enabled: boolean;
  secret: string;
  authenticated: boolean;
}

export class WebSocketEventHandler {
  private socket: WebSocket;
  private logger: Logger;
  private clientId: ClientId;
  private heartbeatContext: HeartbeatContext;
  private authContext: AuthContext;

  constructor(
    socket: WebSocket, 
    logger: Logger, 
    clientId: ClientId,
    authConfig: { enabled: boolean; secret: string }
  ) {
    this.socket = socket;
    this.logger = logger;
    this.clientId = clientId;
    this.authContext = {
      enabled: authConfig.enabled,
      secret: authConfig.secret,
      authenticated: !authConfig.enabled, // If auth disabled, consider authenticated
    };
    
    // Start heartbeat monitoring
    this.heartbeatContext = startHeartbeat(socket, logger);
  }

  onOpen(): void {
    handleOpen({
      socket: this.socket,
      logger: this.logger,
      clientId: this.clientId,
      authContext: this.authContext,
    });
  }

  onMessage(event: MessageEvent): Promise<void> {
    return handleMessage({
      event,
      socket: this.socket,
      logger: this.logger,
      heartbeatContext: this.heartbeatContext,
      authContext: this.authContext,
    });
  }

  onClose(): void {
    handleClose({
      logger: this.logger,
      heartbeatContext: this.heartbeatContext,
    });
  }

  onError(err: Event): void {
    handleError({
      err,
      logger: this.logger,
    });
  }
}
