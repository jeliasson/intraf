dev:
	@npx concurrently \
    -c "red,yellow,blue,green" \
    --prefix "{name}  {time} " \
    --names "SERVER  ,CLIENT 1,CLIENT 2" \
    "cd server && deno task dev" \
		"cd client && deno task dev" \
		"cd client && deno task dev --log-level=debug"

# Development mode with watch
client-dev:
	@cd client && deno task dev

server-dev:
	@cd server && deno task dev

# Run without watch (production)
client-run:
	@cd client && deno task run

server-run:
	@cd server && deno task run
