# intraf# intraf# intraf



An open-source tunneling service built with Deno and WebSockets.An open-source tunneling serviceAn open-source tunneling service



## Quick Start



### Running the Server## Configuration## Configuration



```bash

cd server

deno task devThe project uses a **schema-driven configuration system** that automatically generates CLI arguments and environment variables from a configuration schema. This means you only need to define your config structure once, and the rest is handled automatically.Intraf uses a flexible configuration system that supports multiple sources with the following precedence (highest to lowest):

```



Default: `http://0.0.0.0:8000`

### How It Works1. **CLI Arguments** (highest priority)

### Running the Client

2. **Environment Variables**

```bash

cd clientEach application (client/server) defines a configuration schema with defaults:3. **Config File** (lowest priority)

deno task dev

```



Default: connects to `ws://127.0.0.1:8000````typescript### Config File



### Run Bothconst serverSchema = {



```bash  server: {Both client and server look for an `intraf.yaml` file in their respective directories. A warning will be logged if the file is not found.

make dev

```    host: { default: "0.0.0.0", description: "Server host address" },



## Configuration    port: { default: 8000, description: "Server port" },Example `intraf.yaml`:



Intraf uses a **schema-driven configuration system** that automatically generates CLI arguments and environment variables.  },



### Quick Example  logLevel: { ```yaml



```yaml    default: parseLogLevel("info"),# Server configuration

# intraf.yaml

server:    transform: parseLogLevel,server:

  host: 0.0.0.0

  port: 8000  },  host: 0.0.0.0



logLevel: info} satisfies ConfigSchema;  port: 8000

```

```

Or use environment variables:

```bash# Client configuration

export INTRAF_SERVER_HOST=0.0.0.0

export INTRAF_SERVER_PORT=8000From this schema, the system **automatically generates**:client:

```

- **Config file keys**: `server.host`, `server.port`, `logLevel`  serverUrl: ws://127.0.0.1:8000

Or CLI arguments:

```bash- **CLI arguments**: `--server-host`, `--server-port`, `--log-level`  reconnectDelay: 1000

deno task dev --server-host=0.0.0.0 --server-port=8000

```- **Environment variables**: `INTRAF_SERVER_HOST`, `INTRAF_SERVER_PORT`, `INTRAF_LOG_LEVEL`



**Configuration precedence**: CLI args > Environment variables > Config file > Defaults# Common configuration



📚 **[Full Configuration Guide](docs/CONFIG-EXAMPLES.md)**The resolved configuration is **fully type-safe** with TypeScript inference.logLevel: info



## Features```



- ✅ WebSocket-based client-server communication### Configuration Precedence

- ✅ Automatic heartbeat mechanism (ping/pong)

- ✅ Server-assigned client IDs### Environment Variables

- ✅ Schema-driven configuration (YAML/env/CLI)

- ✅ Structured logging with multiple levelsConfiguration is loaded from multiple sources (highest to lowest priority):

- ✅ Type-safe configuration with TypeScript

- ✅ Hot reload in development mode1. **CLI arguments** (highest priority)All environment variables are prefixed with `INTRAF_`:



## Log Levels2. **Environment variables**



Set log level via config file, environment variable, or CLI:3. **Config file** (intraf.yaml)```bash



```bash4. **Schema defaults** (lowest priority)# Server settings

deno task dev --log-level=debug

```export INTRAF_SERVER_HOST=0.0.0.0



Available levels: `debug`, `info` (default), `warn`, `error`, `critical`### Config File (intraf.yaml)export INTRAF_SERVER_PORT=8000



## Documentation



- **[Configuration Examples](docs/CONFIG-EXAMPLES.md)** - Detailed configuration guide with examplesCreate an `intraf.yaml` file in the server or client directory:# Client settings

- **[Agent Instructions](AGENT.md)** - Guide for AI agents working on this codebase

export INTRAF_CLIENT_SERVER_URL=ws://127.0.0.1:8000

## Project Structure

```yamlexport INTRAF_CLIENT_RECONNECT_DELAY=1000

```

intraf/# Server settings

├── client/          # WebSocket client

├── server/          # WebSocket serverserver:# Common settings

├── common/          # Shared code (config, types, logging)

└── docs/            # Documentation  host: 0.0.0.0export INTRAF_LOG_LEVEL=debug

```

  port: 8000```

## Development



Built with:

- **Deno** - Runtime# Client settings### CLI Arguments

- **TypeScript** - Language

- **WebSockets** - Communication protocolclient:



Key architectural decisions:  serverUrl: ws://127.0.0.1:8000```bash

- Schema-driven configuration (no hardcoded CLI/env parsing)

- Class-based event handlers with object parameters  reconnectDelay: 1000# Server

- Separate client/server schemas for clean separation

- Full type safety with TypeScript inferencedeno task dev --server-host=0.0.0.0 --server-port=8000 --log-level=debug


# Common settings

logLevel: info# Client

```deno task dev --server=ws://127.0.0.1:8000 --reconnect-delay=1000 --log-level=debug

```

### Environment Variables

### Configuration Debug

Environment variables follow the pattern `{PREFIX}_{SECTION}_{FIELD}`:

When running with `--log-level=debug`, you'll see a detailed breakdown of all configuration sources and the final resolved values.

```bash

# Server settings## Development

export INTRAF_SERVER_HOST=0.0.0.0

export INTRAF_SERVER_PORT=8000### Running the project



# Client settings```bash

export INTRAF_CLIENT_SERVER_URL=ws://127.0.0.1:8000# Run both client and server in development mode (with watch)

export INTRAF_CLIENT_RECONNECT_DELAY=1000make dev



# Common settings (top-level fields)# Run client only

export INTRAF_LOG_LEVEL=debugmake client-dev

```

# Run server only

The prefix (`INTRAF`) and naming are **automatically derived** from the schema structure.make server-dev

```

### CLI Arguments

### Log Levels

CLI arguments follow the pattern `--{section}-{field}`:

The project supports the following log levels (in order of verbosity):

```bash- `DEBUG` - Detailed information for debugging (includes heartbeat ping/pong)

# Server- `INFO` - General informational messages (default)

deno task dev --server-host=0.0.0.0 --server-port=8000 --log-level=debug- `WARN` - Warning messages

- `ERROR` - Error messages

# Client  - `CRITICAL` - Critical errors

deno task dev --client-server-url=ws://127.0.0.1:8000 --client-reconnect-delay=1000 --log-level=debug

```#### Setting log level



The argument names are **automatically generated** from the schema keys.You can set the log level using the `--log-level` or `-l` flag:



### Configuration Debug```bash

# Run server with debug logging

When running with `--log-level=debug`, you'll see a detailed breakdown of all configuration sources and the final resolved values:cd server && deno task dev --log-level=debug



```# Run client with debug logging

=== Configuration Debug ===cd client && deno task dev --log-level=debug

Config sources loaded: 3

  - Config file: {"server":{"host":"0.0.0.0","port":8000}}# Or use the shorthand

  - Environment variables: {"logLevel":"debug"}cd server && deno task dev -l debug

  - CLI arguments: {"server":{"port":9000}}

Resolved configuration:# Convenience tasks for debug mode

  server:cd server && deno task dev:debug

    host: 0.0.0.0cd client && deno task dev:debug

    port: 9000```

  logLevel: 0

=========================#### Log format

```

Logs include:

### Adding New Configuration Options- **Timestamp** - ISO 8601 format

- **Log level** - Color-coded for easy identification

To add a new configuration option, simply add it to the schema:- **Prefix** - Component identifier (CLIENT, SERVER, or client ID)

- **Message** - The log message

```typescript

const serverSchema = {Example:

  server: {```

    host: { default: "0.0.0.0" },2025-11-28T12:34:56.789Z INFO     [SERVER] Starting server with log level: 1

    port: { default: 8000 },2025-11-28T12:34:57.123Z INFO     [a1b2c3d4e5] Client connected

    maxConnections: { default: 100 },  // ← New option2025-11-28T12:34:57.456Z DEBUG    [a1b2c3d4e5] Received ping, sending pong

  },```

  logLevel: { default: parseLogLevel("info"), transform: parseLogLevel },
};
```

This automatically creates:
- CLI arg: `--server-max-connections`
- Env var: `INTRAF_SERVER_MAX_CONNECTIONS`
- Type-safe access: `config.server.maxConnections`

No additional code needed!

## Development

### Running the project

```bash
# Run both client and server in development mode (with watch)
make dev

# Run client only
make client-dev

# Run server only
make server-dev
```

### Log Levels

The project supports the following log levels (in order of verbosity):
- `DEBUG` - Detailed information for debugging (includes heartbeat ping/pong)
- `INFO` - General informational messages (default)
- `WARN` - Warning messages
- `ERROR` - Error messages
- `CRITICAL` - Critical errors

#### Setting log level

You can set the log level using the `--log-level` or `-l` flag:

```bash
# Run server with debug logging
cd server && deno task dev --log-level=debug

# Run client with debug logging
cd client && deno task dev --log-level=debug

# Or use the shorthand
cd server && deno task dev -l debug

# Convenience tasks for debug mode
cd server && deno task dev:debug
cd client && deno task dev:debug
```

#### Log format

Logs include:
- **Timestamp** - ISO 8601 format
- **Log level** - Color-coded for easy identification
- **Prefix** - Component identifier (CLIENT, SERVER, or client ID)
- **Message** - The log message

Example:
```
2025-11-28T12:34:56.789Z INFO     [SERVER] Starting server with log level: 1
2025-11-28T12:34:57.123Z INFO     [a1b2c3d4e5] Client connected
2025-11-28T12:34:57.456Z DEBUG    [a1b2c3d4e5] Received ping, sending pong
```
