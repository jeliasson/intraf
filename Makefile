dev:
	@npx concurrently \
    -c "red,yellow,blue,green" \
    --prefix "{name}  {time} " \
    --names "CONTROL,CLIENT 1,CLIENT 2" \
    "cd packages/control && deno task dev" \
		"cd packages/client && deno task dev" \
		"cd packages/client && deno task dev --log-level=debug"

# Development mode with watch
client-dev:
	@cd packages/client && clear && deno task dev

control-dev:
	@cd packages/control && clear && deno task dev

# Alias for backward compatibility
server-dev: control-dev

# Run without watch (production)
client-run:
	@cd packages/client && deno task run

control-run:
	@cd packages/control && deno task run

# Alias for backward compatibility
server-run: control-run
