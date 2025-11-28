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

  constructor(socket: WebSocket, logger: Logger) {
    this.socket = socket;
    this.logger = logger;
  }

  onOpen(): void {
    handleOpen({ logger: this.logger });
  }

  onMessage(event: MessageEvent): void {
    const context = {
      clientId: this.clientId,
      heartbeatContext: this.heartbeatContext,
    };
    
    handleMessage({
      event,
      socket: this.socket,
      logger: this.logger,
      context,
    });
    
    // Update our local references
    this.clientId = context.clientId;
    this.heartbeatContext = context.heartbeatContext;
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
