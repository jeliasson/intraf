# Configuration

The project uses a schema-driven configuration system that auto-generates CLI arguments and environment variables.

## How It Works

Define a config schema once:

```typescript
const schema = {
  server: {
    host: { default: "0.0.0.0" },
    port: { default: 8000 },
  },
  database: {
    hostname: { default: "localhost" },
    port: { default: 3306 },
  },
} satisfies ConfigSchema;
```

This automatically creates:
- CLI args: `--server-host`, `--server-port`, `--database-hostname`
- Env vars: `INTRAF_SERVER_HOST`, `INTRAF_SERVER_PORT`, `INTRAF_DATABASE_HOSTNAME`
- Type-safe access: `config.server.host`, `config.database.port`

## Precedence

1. CLI arguments (highest)
2. Environment variables
3. Config file (`intraf.yaml`)
4. Schema defaults (lowest)

## Usage Examples

### YAML Config File

`server/intraf.yaml`:
```yaml
server:
  host: 0.0.0.0
  port: 8000

database:
  hostname: localhost
  port: 3306
  username: root
  password: ""
  database: intraf

log:
  level: info
```

### Environment Variables

```bash
export INTRAF_SERVER_PORT=9000
export INTRAF_DATABASE_PASSWORD=secret
export INTRAF_LOG_LEVEL=debug
```

### CLI Arguments

```bash
deno task dev --server-port=9000 --database-password=secret --log-level=debug
```

## Adding New Options

Just add to the schema - everything else is automatic:

```typescript
const schema = {
  server: {
    host: { default: "0.0.0.0" },
    port: { default: 8000 },
    maxConnections: { default: 100 },  // ← New option
  },
};
```

Now available as:
- `--server-max-connections=200`
- `INTRAF_SERVER_MAX_CONNECTIONS=200`
- `config.server.maxConnections`

## Server Options

See `server/src/server.ts` for the complete schema.

Common options:
- `--server-host` - Server host address
- `--server-port` - Server port
- `--database-hostname` - Database host
- `--database-port` - Database port
- `--database-username` - Database user
- `--database-password` - Database password
- `--database-database` - Database name
- `--log-level` - Log level (debug, info, warn, error, critical)

## Client Options

See `client/src/client.ts` for the complete schema.

Common options:
- `--log-level` - Log level
- Additional options TBD

## Debug Mode

Run with `--log-level=debug` to see:
- Configuration resolution details
- SQL query logging
- Detailed heartbeat messages
- All DEBUG level logs
