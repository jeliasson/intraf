# Agent Instructions

This document provides instructions for AI agents working on the `intraf` codebase. It's model-agnostic and should help you understand the project structure, conventions, and how to make changes effectively.

## Project Overview

**intraf** is a tunneling service with a WebSocket-based client-server architecture built with Deno and TypeScript.

### Key Characteristics

- **Runtime**: Deno (not Node.js)
- **Language**: TypeScript with strict type checking
- **Architecture**: Client-server with WebSocket communication
- **Configuration**: Schema-driven, auto-generating CLI/env/file support
- **Logging**: Structured logging with multiple levels

## Repository Structure

```
intraf/
├── client/
│   ├── deno.json           # Deno config with tasks
│   ├── intraf.yaml         # Example client config
│   └── src/
│       ├── client.ts       # Main entry point
│       └── ws/             # WebSocket event handlers
├── server/
│   ├── deno.json           # Deno config with tasks
│   ├── intraf.yaml         # Example server config
│   └── src/
│       ├── server.ts       # Main entry point
│       └── ws/             # WebSocket event handlers
├── common/
│   ├── deno.json           # Shared Deno config
│   └── src/
│       ├── config.ts       # Schema-driven configuration system
│       ├── types.ts        # Shared TypeScript types
│       ├── websocket.ts    # WebSocket utilities & constants
│       └── cli/
│           ├── cli.ts      # CLI utilities
│           └── logger.ts   # Logging system
├── docs/                   # Documentation (except README)
│   ├── CONFIG-EXAMPLES.md  # Configuration examples
│   └── STRANGE-AI.md       # Historical AI interaction notes
├── README.md               # Short overview with links
├── AGENT.md                # This file
└── Makefile                # Development convenience commands
```

## Core Concepts

### 1. Schema-Driven Configuration

**Most Important**: Configuration is NOT hardcoded. It's generated from schemas.

**Location**: `common/src/config.ts`

**How it works**:

1. Define a schema with defaults:
```typescript
const serverSchema = {
  server: {
    host: { default: "0.0.0.0", description: "Server host" },
    port: { default: 8000 },
  },
  logLevel: { 
    default: parseLogLevel("info"),
    transform: parseLogLevel,  // Optional transform function
  },
} satisfies ConfigSchema;
```

2. Load config:
```typescript
const config = await loadConfig(serverSchema, "./intraf.yaml", "INTRAF", logger);
```

3. Access values (type-safe):
```typescript
config.server.host  // string
config.server.port  // number
config.logLevel     // LogLevel
```

**Automatic generation**:
- Schema `server.host` → CLI arg `--server-host` → Env var `INTRAF_SERVER_HOST`
- Naming is derived from the schema structure automatically
- No manual CLI parsing or env lookup needed

**Precedence**: CLI args > Environment variables > Config file > Schema defaults

### 2. Event Handler Architecture

**Pattern**: Class-based event handlers with object parameters (not positional arguments).

**Example** (`server/src/ws/events.ts`):
```typescript
export class WebSocketEventHandler {
  constructor(
    private socket: WebSocket,
    private logger: Logger,
    private clientId: string,
  ) {}

  onOpen(): void {
    handleOpen({ socket: this.socket, logger: this.logger, clientId: this.clientId });
  }

  onMessage(event: MessageEvent): void {
    handleMessage({ socket: this.socket, logger: this.logger, clientId: this.clientId, event });
  }
}
```

**Individual handlers** (`server/src/ws/events/message.ts`):
```typescript
interface MessageHandlerParams {
  socket: WebSocket;
  logger: Logger;
  clientId: string;
  event: MessageEvent;
}

export function handleMessage({ socket, logger, clientId, event }: MessageHandlerParams): void {
  // Implementation
}
```

**Why**: Avoids positional parameter confusion, makes code more maintainable.

### 3. Logging System

**Location**: `common/src/cli/logger.ts`

**Levels**: DEBUG (0) < INFO (1) < WARN (2) < ERROR (3) < CRITICAL (4)

**Usage**:
```typescript
const logger = new Logger("PREFIX", LogLevel.INFO);
logger.debug("Debug message");      // Only shown if level is DEBUG
logger.info("Info message");         // Shown if level is INFO or below
logger.warn("Warning");
logger.error("Error");
logger.critical("Critical error");
```

**Features**:
- Color-coded output
- ISO 8601 timestamps
- Configurable log level
- Method to get level name: `logger.getLevelName()`

### 4. Heartbeat Mechanism

**Client side** (`client/src/ws/heartbeat.ts`):
- Sends "ping" every 30 seconds
- Expects "pong" within 5 seconds
- Closes connection if no pong received

**Server side** (`server/src/ws/heartbeat.ts`):
- Monitors last heartbeat timestamp per client
- Closes connection if no ping received in 90 seconds
- Responds with "pong" to "ping" messages

**Constants**: Defined in `common/src/websocket.ts`

### 5. Type System

**Location**: `common/src/types.ts`

**Pattern**: Use TypeScript interfaces and enums with type guards.

```typescript
export enum MessageType {
  PING = "ping",
  PONG = "pong",
  CLIENT_ID = "client_id",
}

export interface ClientIdMessage {
  type: MessageType.CLIENT_ID;
  clientId: string;
}

// Type guard
export function isClientIdMessage(msg: unknown): msg is ClientIdMessage {
  return (msg as ClientIdMessage)?.type === MessageType.CLIENT_ID;
}
```

**Why**: Provides runtime type checking for WebSocket messages.

## Making Changes

### Adding a New Configuration Option

1. **Update the schema** in `client/src/client.ts` or `server/src/server.ts`:
```typescript
const serverSchema = {
  server: {
    host: { default: "0.0.0.0" },
    port: { default: 8000 },
    timeout: { default: 30000 },  // ← Add here
  },
  logLevel: { default: parseLogLevel("info"), transform: parseLogLevel },
} satisfies ConfigSchema;
```

2. **Use it** (TypeScript will infer the type):
```typescript
const config = await loadConfig(serverSchema, ...);
console.log(config.server.timeout);  // number, fully type-safe
```

3. **Done!** CLI args (`--server-timeout`) and env vars (`INTRAF_SERVER_TIMEOUT`) are automatically available.

### Adding a New WebSocket Message Type

1. **Add to enum** in `common/src/types.ts`:
```typescript
export enum MessageType {
  PING = "ping",
  PONG = "pong",
  CLIENT_ID = "client_id",
  NEW_TYPE = "new_type",  // ← Add here
}
```

2. **Create interface**:
```typescript
export interface NewTypeMessage {
  type: MessageType.NEW_TYPE;
  data: string;
}
```

3. **Create type guard**:
```typescript
export function isNewTypeMessage(msg: unknown): msg is NewTypeMessage {
  return (msg as NewTypeMessage)?.type === MessageType.NEW_TYPE;
}
```

4. **Handle in message handler** (`server/src/ws/events/message.ts` or `client/src/ws/events/message.ts`):
```typescript
if (isNewTypeMessage(message)) {
  // Handle new message type
}
```

### Adding a New Event Handler

1. **Create handler file** (e.g., `server/src/ws/events/custom.ts`):
```typescript
interface CustomHandlerParams {
  socket: WebSocket;
  logger: Logger;
  customParam: string;
}

export function handleCustom({ socket, logger, customParam }: CustomHandlerParams): void {
  logger.info(`Handling custom event: ${customParam}`);
}
```

2. **Import and use** in `server/src/ws/events.ts`:
```typescript
import { handleCustom } from "./events/custom.ts";

export class WebSocketEventHandler {
  // ... existing code ...
  
  onCustom(customParam: string): void {
    handleCustom({ 
      socket: this.socket, 
      logger: this.logger, 
      customParam 
    });
  }
}
```

### Modifying the Configuration System

**Warning**: The config system is a core piece. Changes here affect everything.

**Key files**:
- `common/src/config.ts` - The configuration engine
- Client schema in `client/src/client.ts`
- Server schema in `server/src/server.ts`

**If you need to change how CLI args are generated**:
- Modify `toCliArg()` method in `Config` class
- Ensure consistency with `loadCliArguments()` method

**If you need to change how env vars are generated**:
- Modify `toEnvVar()` method in `Config` class
- Ensure consistency with `loadEnvironmentVariables()` method

**Type safety**: The `ResolvedFromSchema<S>` type automatically infers the correct config type from the schema. Don't break this!

## Important Conventions

### File Organization

- **Modular**: Split functionality into small, focused files
- **Directory structure**: Use directories like `ws/`, `ws/events/`, `cli/`
- **Naming**: Use descriptive names (`heartbeat.ts`, not `hb.ts`)

### Code Style

- **Object parameters**: Always use object parameters for functions with multiple args
- **Type safety**: Leverage TypeScript's type system, avoid `any`
- **Interfaces**: Define interfaces for all complex data structures
- **Type guards**: Create type guards for runtime type checking

### Configuration

- **Never hardcode**: Use schema-driven config, don't hardcode CLI args or env vars
- **Defaults in schema**: Always provide sensible defaults in the schema
- **Descriptions**: Add descriptions to config fields when helpful

### Logging

- **Appropriate levels**: 
  - DEBUG: Verbose info (heartbeat pings, detailed state)
  - INFO: Important events (connections, config loaded)
  - WARN: Warnings that don't stop execution
  - ERROR: Errors that need attention
  - CRITICAL: Fatal errors
- **Contextual prefix**: Use meaningful logger prefixes (client ID, "SERVER", "CLIENT")

### Error Handling

- **Type-safe errors**: Use `error instanceof Error` before accessing error properties
- **Graceful degradation**: Log errors but don't crash unnecessarily
- **User-friendly**: Provide clear error messages

## Testing Changes

### Type Checking

```bash
# Check server
cd server && deno check src/server.ts

# Check client
cd client && deno check src/client.ts
```

### Running

```bash
# Run server
cd server && deno task dev

# Run client
cd client && deno task dev

# Run both (from root)
make dev
```

### Verifying Configuration

Run with debug logging to see all config sources:
```bash
deno task dev --log-level=debug
```

You should see:
```
Configuration loaded:
  server.host = 0.0.0.0
  server.port = 8000
  logLevel = 0
Config sources:
  - Config file
  - Environment variables
  - CLI arguments
```

## Common Pitfalls

### ❌ Don't hardcode CLI arguments

```typescript
// BAD
if (Deno.args.includes("--port")) {
  // ...
}
```

```typescript
// GOOD - Add to schema instead
const schema = {
  server: {
    port: { default: 8000 },
  },
} satisfies ConfigSchema;
```

### ❌ Don't use positional parameters

```typescript
// BAD
function handle(socket: WebSocket, logger: Logger, id: string, event: Event) {
  // ...
}
```

```typescript
// GOOD
interface HandleParams {
  socket: WebSocket;
  logger: Logger;
  id: string;
  event: Event;
}

function handle({ socket, logger, id, event }: HandleParams) {
  // ...
}
```

### ❌ Don't break type inference

```typescript
// BAD
const config: any = await loadConfig(...);
```

```typescript
// GOOD - Let TypeScript infer
const config = await loadConfig(schema, ...);
// config.server.port is known to be a number
```

### ❌ Don't skip type guards for WebSocket messages

```typescript
// BAD
const message = JSON.parse(event.data);
if (message.type === "ping") {  // Unsafe!
  // ...
}
```

```typescript
// GOOD
const message = JSON.parse(event.data);
if (isPingMessage(message)) {  // Type-safe!
  // TypeScript knows this is a PingMessage
}
```

## File Imports

Deno uses explicit file extensions. Always include `.ts`:

```typescript
// Correct
import { Logger } from "../../common/src/cli/logger.ts";

// Wrong (will fail in Deno)
import { Logger } from "../../common/src/cli/logger";
```

## Deno-Specific Notes

- **Permissions**: Deno is secure by default. Check `deno.json` tasks for required permissions
- **Standard library**: Use Deno's standard library when possible
- **No node_modules**: Deno doesn't use npm packages the same way. Check import maps in `deno.json`
- **Tasks**: Defined in `deno.json`, run with `deno task <name>`

## Documentation

When making significant changes:

1. **Update README.md** if it affects quick start or features
2. **Update docs/CONFIG-EXAMPLES.md** if adding config options
3. **Update this file (AGENT.md)** if changing core architecture or conventions
4. **Add comments** to complex code sections

## Getting Help

- Check existing code for patterns
- Look at `docs/CONFIG-EXAMPLES.md` for configuration examples
- Review `docs/STRANGE-AI.md` for historical context (cautiously, it's outdated)
- Type errors? Run `deno check src/file.ts` for detailed error messages

## Summary

**Most important things to remember**:

1. ✅ Configuration is schema-driven - don't hardcode
2. ✅ Use object parameters, not positional arguments  
3. ✅ Maintain type safety with TypeScript
4. ✅ Use type guards for runtime checks
5. ✅ Log with appropriate levels
6. ✅ Keep code modular and organized
7. ✅ Include `.ts` extensions in imports

This codebase prioritizes type safety, maintainability, and a clean architecture. When in doubt, follow existing patterns!
