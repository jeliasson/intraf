# AGENTS.md

This document provides AI agents with context about the **intraf** project architecture, conventions, and design patterns to maintain consistency when making code changes.

## Project Overview

**intraf** is an open-source tunneling service built with Deno and WebSockets. The project consists of:

- **Server**: WebSocket server that accepts client connections and manages tunneling
- **Client**: WebSocket client that connects to the server
- **Common**: Shared code (types, configuration, utilities) used by both server and client

## Technology Stack

- **Runtime**: Deno (TypeScript runtime)
- **Protocol**: WebSockets for real-time bidirectional communication
- **Configuration**: YAML files with environment variable and CLI argument support
- **Logging**: Custom logger with colored output and log levels
- **Module System**: Deno's native ESM with JSR imports

## Project Structure

```
intraf/
├── server/           # WebSocket server
│   ├── src/
│   │   ├── server.ts              # Main server entry point
│   │   └── ws/                    # WebSocket event handlers
│   │       ├── events.ts          # Event handler coordinator
│   │       ├── heartbeat.ts       # Server-side heartbeat monitoring
│   │       └── events/            # Individual event handlers
│   │           ├── open.ts        # Connection established
│   │           ├── message.ts     # Message received
│   │           ├── close.ts       # Connection closed
│   │           └── error.ts       # Error handling
│   ├── intraf.yaml                # Server configuration
│   └── deno.json                  # Deno configuration
│
├── client/           # WebSocket client
│   ├── src/
│   │   ├── client.ts              # Main client entry point
│   │   └── ws/                    # WebSocket event handlers
│   │       ├── events.ts          # Event handler coordinator
│   │       ├── heartbeat.ts       # Client-side heartbeat pinging
│   │       └── events/            # Individual event handlers
│   │           ├── open.ts        # Connection established
│   │           ├── message.ts     # Message received
│   │           ├── close.ts       # Connection closed
│   │           └── error.ts       # Error handling
│   ├── intraf.yaml                # Client configuration
│   └── deno.json                  # Deno configuration
│
├── common/           # Shared code
│   ├── src/
│   │   ├── types.ts               # Shared TypeScript types
│   │   ├── config.ts              # Configuration system
│   │   ├── websocket.ts           # WebSocket utilities & constants
│   │   └── cli/                   # CLI utilities
│   │       ├── cli.ts             # CLI argument parsing
│   │       └── logger.ts          # Logging system
│   └── deno.json                  # Deno configuration
│
├── docs/             # Documentation
│   ├── AGENTS.md                  # This file (AI agent guide)
│   ├── CONFIGURATION.md           # Configuration system details
│   ├── DATABASE.md                # Database setup (future)
│   └── STRANGE-AI.md              # Notes on unusual AI decisions
│
├── Makefile          # Development commands
└── README.md         # Project readme
```

## Core Design Patterns

### 1. Configuration System

The project uses a **schema-driven configuration system** that automatically generates CLI arguments and environment variables from a single schema definition.

**Key Files:**
- `common/src/config.ts` - Configuration system implementation
- `server/src/server.ts` - Server configuration schema
- `client/src/client.ts` - Client configuration schema

**Pattern:**
```typescript
const schema = {
  server: {
    host: { default: "0.0.0.0", description: "Server host address" },
    port: { default: 8000, description: "Server port" },
  },
  log: {
    level: { 
      default: parseLogLevel("info"),
      transform: parseLogLevel,
      description: "Log level",
    },
  }
} satisfies ConfigSchema;

const config = await loadConfig(schema, "./intraf.yaml", "INTRAF", logger);
```

**Configuration Precedence (highest to lowest):**
1. CLI arguments (`--server-port=9000`)
2. Environment variables (`INTRAF_SERVER_PORT=9000`)
3. Config file (`intraf.yaml`)
4. Schema defaults

**When adding new configuration options:**
- Add to the appropriate schema (server or client)
- The CLI args and env vars are auto-generated
- Use descriptive names and provide defaults
- Add transform function for complex types (like LogLevel)

### 2. WebSocket Event Handling

WebSocket events are handled through a **modular event handler pattern** with separate files for each event type.

**Pattern:**
```typescript
// events.ts - Coordinator
export class WebSocketEventHandler {
  private socket: WebSocket;
  private logger: Logger;
  private clientId: ClientId;
  private heartbeatContext: HeartbeatContext;

  onOpen(): void {
    handleOpen({ socket, logger, clientId });
  }
  
  onMessage(event: MessageEvent): void {
    handleMessage({ event, socket, logger, heartbeatContext });
  }
  // ... other handlers
}

// events/open.ts - Individual handler
export function handleOpen({ socket, logger, clientId }: OpenHandlerParams): void {
  logger.info("Client connected");
  // Handle connection open logic
}
```

**Key Principles:**
- Each event handler is in its own file (`open.ts`, `message.ts`, `close.ts`, `error.ts`)
- Handlers receive parameters via an interface (e.g., `OpenHandlerParams`)
- The coordinator class (`WebSocketEventHandler`) manages context and delegates to handlers
- Server and client have different implementations but follow the same structure

### 3. Heartbeat System

The project implements a **bidirectional heartbeat** to detect stale connections:

**Client-side** (`client/src/ws/heartbeat.ts`):
- Sends `ping` messages every 5 seconds
- Waits for `pong` response within 3 seconds
- Closes connection if no pong received

**Server-side** (`server/src/ws/heartbeat.ts`):
- Monitors last heartbeat timestamp
- Checks every 10 seconds
- Closes connection if no heartbeat for 30 seconds

**Constants** (`common/src/websocket.ts`):
```typescript
export const HEARTBEAT_INTERVAL = 5000;         // Client ping interval
export const HEARTBEAT_TIMEOUT = 3000;          // Client pong timeout
export const HEARTBEAT_CHECK_INTERVAL = 10000;  // Server check interval
export const SERVER_HEARTBEAT_TIMEOUT = 30000;  // Server timeout threshold
```

### 4. Type-Safe Message System

WebSocket messages use a **discriminated union type system** for type safety:

**Pattern** (`common/src/types.ts`):
```typescript
export enum MessageType {
  CLIENT_ID = "client_id",
  HEARTBEAT_PING = "ping",
  HEARTBEAT_PONG = "pong",
}

export interface BaseMessage {
  type: MessageType;
}

export interface ClientIdMessage extends BaseMessage {
  type: MessageType.CLIENT_ID;
  id: ClientId;
}

// Type guard
export function isClientIdMessage(data: unknown): data is ClientIdMessage {
  return (
    typeof data === "object" &&
    data !== null &&
    "type" in data &&
    data.type === MessageType.CLIENT_ID &&
    "id" in data &&
    typeof data.id === "string"
  );
}
```

**When adding new message types:**
1. Add to `MessageType` enum
2. Create interface extending `BaseMessage`
3. Add to `WebSocketMessage` union type
4. Create type guard function

### 5. Logging System

The project uses a **custom logger** with log levels and colored output:

**Log Levels** (in order of severity):
- `DEBUG` - Detailed diagnostic information (cyan)
- `INFO` - General informational messages (green)
- `WARN` - Warning messages (yellow)
- `ERROR` - Error messages (red)
- `CRITICAL` - Critical failures (magenta)

**Usage:**
```typescript
const logger = new Logger("PREFIX", LogLevel.INFO);
logger.debug("Debug message");   // Only shown if level <= DEBUG
logger.info("Info message");
logger.warn("Warning message");
logger.error("Error message");
logger.critical("Critical error");
```

**Key Points:**
- Each component/connection should have its own logger instance
- Use appropriate prefixes (e.g., "SERVER", "CLIENT", client ID)
- Log level can be configured via config system
- Debug logs include detailed heartbeat and config info

### 6. Client ID Assignment

The server generates and assigns unique client IDs:

**Flow:**
1. Server generates random 10-character hex ID on connection (`generateClientId()`)
2. Server sends `CLIENT_ID` message to client with assigned ID
3. Client stores ID and uses it in logging
4. Server uses ID as logger prefix for that connection

**Implementation** (`common/src/websocket.ts`):
```typescript
export function generateClientId(): ClientId {
  const buffer = new Uint8Array(16);
  crypto.getRandomValues(buffer);
  const hexString = Array.from(buffer)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  return hexString.substring(0, 10);
}
```

## Coding Conventions

### TypeScript Style

- Use explicit type annotations for function parameters and return types
- Prefer `interface` for parameter objects, `type` for unions/intersections
- Export types that are shared across modules
- Use `satisfies` operator for schema validation

### File Organization

- One responsibility per file (small, focused modules)
- Group related functionality in directories (e.g., `ws/events/`)
- Use index-style exports from coordinator files
- Import paths use relative imports within modules, absolute for cross-module

### Naming Conventions

- **Files**: lowercase with hyphens (e.g., `heartbeat.ts`, `events/open.ts`)
- **Classes**: PascalCase (e.g., `WebSocketEventHandler`, `Logger`)
- **Functions**: camelCase (e.g., `handleOpen`, `generateClientId`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `HEARTBEAT_INTERVAL`)
- **Types/Interfaces**: PascalCase (e.g., `ClientId`, `MessageType`)

### Error Handling

- Log errors with appropriate severity level
- Handle expected errors gracefully (e.g., "Unexpected EOF" on client disconnect)
- Clean up resources in error handlers (e.g., stop heartbeat intervals)
- Use try-catch for parsing operations (e.g., JSON.parse)

## Development Workflow

### Running the Project

```bash
# Run server only
make server-dev

# Run client only
make client-dev

# Run both with watch mode
make dev
```

### Deno Tasks

```bash
# Server
cd server
deno task dev   # Development with watch mode
deno task run   # Production run

# Client
cd client
deno task dev   # Development with watch mode
deno task run   # Production run
```

### Configuration Options

**Server:**
- `--server-host` - Server host address (default: 0.0.0.0)
- `--server-port` - Server port (default: 8000)
- `--log-level` - Log level (default: info)

**Client:**
- `--server-host` - Server host to connect to (default: 127.0.0.1)
- `--server-port` - Server port to connect to (default: 8000)
- `--server-reconnect-delay` - Initial connection delay in ms (default: 1000)
- `--log-level` - Log level (default: info)

## Common Tasks for AI Agents

### Adding a New Message Type

1. Add to `MessageType` enum in `common/src/types.ts`
2. Create interface extending `BaseMessage`
3. Add to `WebSocketMessage` union type
4. Create type guard function
5. Handle in server `message.ts` handler
6. Handle in client `message.ts` handler

### Adding a Configuration Option

1. Add to schema in `server/src/server.ts` or `client/src/client.ts`
2. Provide default value and optional description
3. Use the config value in your code via the resolved config object
4. Document in `docs/CONFIGURATION.md` if user-facing

### Adding a New Event Handler

1. Create new file in `ws/events/` directory
2. Define params interface
3. Export handler function
4. Import and call from `WebSocketEventHandler` class
5. Update context if needed (e.g., new state to track)

### Modifying Heartbeat Behavior

1. Update constants in `common/src/websocket.ts`
2. Modify logic in `client/src/ws/heartbeat.ts` (client-side)
3. Modify logic in `server/src/ws/heartbeat.ts` (server-side)
4. Test with multiple clients and network conditions

## Known Issues and Considerations

See `docs/STRANGE-AI.md` for notes on unusual design decisions made by previous AI agents.

**Current notes:**
1. Initial implementation had clients select their own names instead of server-assigned IDs
2. Early config system hard-coded settings instead of using schema-driven approach

## Future Enhancements

Based on the codebase structure, potential areas for expansion:

1. **Database Integration** - Sequelize ORM with SQLite/MariaDB (see `docs/DATABASE.md`)
2. **Tunnel Management** - HTTP tunnel creation and routing
3. **Authentication** - Client authentication and authorization
4. **Admin API** - REST API for managing tunnels and clients
5. **Web Dashboard** - Browser-based monitoring and management UI

## Best Practices for AI Agents

1. **Maintain Consistency**: Follow existing patterns and conventions
2. **Incremental Changes**: Make small, focused changes that align with architecture
3. **Update Documentation**: Keep docs in sync with code changes
4. **Test Changes**: Consider edge cases, especially around disconnections and timeouts
5. **Respect the Schema**: Use the config system for new options rather than hard-coding
6. **Preserve Type Safety**: Maintain strict TypeScript types and guards
7. **Log Appropriately**: Use correct log levels and provide context in messages
8. **Clean Up Resources**: Always stop intervals, close connections, etc.

## Questions or Clarifications

If you encounter ambiguity or need to make a decision not covered by this guide:

1. Look for similar patterns in the existing codebase
2. Prioritize consistency with current architecture
3. Document unusual decisions in `docs/STRANGE-AI.md`
4. Ask the user if fundamentally changing architecture or patterns

---

**Last Updated**: January 2026
**Deno Version**: Compatible with Deno 2.x
**Target Audience**: AI coding agents, automated code generators, LLM-based development tools
