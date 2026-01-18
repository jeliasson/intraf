import type { Logger } from "../../../common/src/cli/logger.ts";
import type { ClientId } from "../../../common/src/types.ts";
import { handleOpen } from "./events/open.ts";
import { handleMessage } from "./events/message.ts";
import { handleClose } from "./events/close.ts";
import { handleError } from "./events/error.ts";
import type { HeartbeatContext } from "./heartbeat.ts";

export class WebSocketEventHandler {
  private socket: WebSocket;
  private logger: Logger;
  private clientId: ClientId | null = null;
  private heartbeatContext: HeartbeatContext | null = null;
  private loginInProgress: boolean = false;
  private onClientIdChange?: (id: ClientId) => void;

  constructor(socket: WebSocket, logger: Logger, onClientIdChange?: (id: ClientId) => void) {
    this.socket = socket;
    this.logger = logger;
    this.onClientIdChange = onClientIdChange;
  }

  onOpen(): void {
    handleOpen({ logger: this.logger });
  }

  onMessage(event: MessageEvent): Promise<void> {
    const context = {
      clientId: this.clientId,
      heartbeatContext: this.heartbeatContext,
      loginInProgress: this.loginInProgress,
    };
    
    return handleMessage({
      event,
      socket: this.socket,
      logger: this.logger,
      context,
    }).then(() => {
      // Check if client ID changed and notify
      if (context.clientId && context.clientId !== this.clientId && this.onClientIdChange) {
        this.onClientIdChange(context.clientId);
      }
      
      // Update our local references
      this.clientId = context.clientId;
      this.heartbeatContext = context.heartbeatContext;
      this.loginInProgress = context.loginInProgress;
    });
  }

  onClose(): void {
    handleClose({
      logger: this.logger,
      heartbeatContext: this.heartbeatContext,
    });
  }

  onError(err: Event | ErrorEvent): void {
    handleError({
      err,
      logger: this.logger,
    });
  }
}
