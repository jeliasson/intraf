import type { Logger } from "../../../common/src/logger.ts";
import type { ClientId } from "../../../common/src/types.ts";
import { handleOpen } from "./events/open.ts";
import { handleMessage } from "./events/message.ts";
import { handleClose } from "./events/close.ts";
import { handleError } from "./events/error.ts";
import type { HeartbeatContext } from "./heartbeat.ts";
import { startHeartbeat } from "./heartbeat.ts";

export class WebSocketEventHandler {
  private socket: WebSocket;
  private logger: Logger;
  private clientId: ClientId;
  private heartbeatContext: HeartbeatContext;

  constructor(socket: WebSocket, logger: Logger, clientId: ClientId) {
    this.socket = socket;
    this.logger = logger;
    this.clientId = clientId;
    
    // Start heartbeat monitoring
    this.heartbeatContext = startHeartbeat(socket, logger);
  }

  onOpen(): void {
    handleOpen({
      socket: this.socket,
      logger: this.logger,
      clientId: this.clientId,
    });
  }

  onMessage(event: MessageEvent): void {
    handleMessage({
      event,
      socket: this.socket,
      logger: this.logger,
      heartbeatContext: this.heartbeatContext,
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
