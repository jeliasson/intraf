# intraf


An open-source tunneling service built with Deno and WebSockets.

## Quick Start

```bash
# Run server (uses SQLite by default)
cd server && deno task dev

# Run client (in another terminal)
cd client && deno task dev

# Or run both with watch mode
make dev
```

## Development

```bash
make dev          # Run both client and server with watch mode
make server-dev   # Run server only
make client-dev   # Run client only
```

## Configuration

Both client and server use `intraf.yaml` config files with CLI and environment variable support.

```bash
# CLI arguments
deno task dev --log-level=debug --server-port=9000

# Environment variables
export INTRAF_LOG_LEVEL=debug
export INTRAF_SERVER_PORT=9000
```

## Documentation

See [docs/](./docs/) for detailed information:
- `AGENT.md` - Project architecture and conventions for AI agents
- `CONFIGURATION.md` - Configuration system details
- `DATABASE.md` - Database setup and usage
