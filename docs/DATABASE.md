# Database

The server uses Sequelize TypeScript ORM with SQLite (default) or MariaDB/MySQL.

## Quick Start

```bash
# Run server (SQLite by default, creates tables automatically)
cd server
deno task dev
```

SQLite database is stored at `server/data/intraf.db` by default.
Tables are created automatically from Sequelize models - no SQL scripts needed.

## Models

### Connection
Tracks WebSocket client connections.

```typescript
await Connection.create({
  clientId: "abc123",
  connectedAt: new Date(),
  isActive: true,
});

// Find active connections
const active = await Connection.findAll({
  where: { isActive: true },
});
```

### Heartbeat
Logs client heartbeat pings.

```typescript
await Heartbeat.create({
  clientId: "abc123",
  timestamp: new Date(),
});

// Get recent heartbeats
const recent = await Heartbeat.findAll({
  where: { clientId: "abc123" },
  order: [["timestamp", "DESC"]],
  limit: 10,
});
```

## Schema

Tables are automatically created from models defined in `server/src/models/`.

**connections**:
- `id` - Primary key
- `client_id` - Client identifier
- `connected_at` - Connection timestamp
- `disconnected_at` - Disconnection timestamp
- `is_active` - Boolean status

**heartbeats**:
- `id` - Primary key
- `client_id` - Client identifier
- `timestamp` - Heartbeat timestamp

## Configuration

### SQLite (Default)

Configure via `server/intraf.yaml`:

```yaml
database:
  type: sqlite
  storage: ./data/intraf.db  # Optional, defaults to ./data/intraf.db
```

Or via environment variables:
```bash
export INTRAF_DATABASE_TYPE=sqlite
export INTRAF_DATABASE_STORAGE=./data/intraf.db
```

### MySQL/MariaDB (Production)

For production, use MySQL/MariaDB:

```yaml
database:
  type: mariadb
  hostname: localhost
  port: 3306
  username: root
  password: ""
  database: intraf
```

Or via environment variables:
```bash
export INTRAF_DATABASE_TYPE=mariadb
export INTRAF_DATABASE_HOSTNAME=localhost
export INTRAF_DATABASE_PASSWORD=secret
```

Start MariaDB with Docker:
```bash
cd server
docker-compose up -d
```

## Notes

- Schema managed by Sequelize, not SQL scripts
- Tables sync automatically on startup
- Connection pooling handled by Sequelize
- Query logging enabled in debug mode (`--log-level=debug`)
