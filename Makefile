dev:
	@npx concurrently \
    -c "red,yellow,blue,green" \
    --prefix "{name}  {time} " \
    --names "SERVER  ,CLIENT  " \
    "make server-dev" \
		"make client-dev"

# Development mode with watch
client-dev:
	@deno run \
		--allow-net \
		--watch \
		./client/src/client.ts

server-dev:
	@deno run \
		--allow-net \
		--watch \
		./server/src/server.ts

# Run without watch (production)
client-run:
	@deno run \
		--allow-net \
		./client/src/client.ts

server-run:
	@deno run \
		--allow-net \
		./server/src/server.ts
