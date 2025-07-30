.PHONY: all install install-prod build build-prod pack test clean proxy sgw-sse sgw-mcp help

all: install build pack

# Install dependencies (including dev dependencies for build)
install:
	# if package-lock.json is not present, run npm install
	if [ ! -f package-lock.json ]; then \
		echo "package-lock.json not found, running npm install..."; \
		npm install; \
	fi
	npm ci

# Install only production dependencies (for runtime)
install-prod:
	# if package-lock.json is not present, run npm install
	if [ ! -f package-lock.json ]; then \
		echo "package-lock.json not found, running npm install..."; \
		npm install; \
	fi
	npm ci --omit=dev

# Build MCP server (including dev dependencies)
build: install
	npm run build

# Build MCP server (production dependencies only)
build-prod: install
	npm run build-prod

# Run dev server for local development with production dependencies
run: install
	npm start

# Pack MCP server for Claude Desktop (production dependencies only)
_pack: build-prod install-prod
	@echo "Packing MCP server for Claude Desktop..."
	zip -r bon-calculadora-mcp-js-server.dxt manifest.json icon.png package*.json node_modules/ build/
pack: _pack install
	@echo "Packaged bon-calculadora-mcp-js-server.dxt successfully."

# Simple test for MCP server
test-stdio:
	npm run test-stdio

# Test stdio from the inspector with stdio
test-inspector:
	npm run test-inspector

# Run inspector for debugging
inspector:
	npx @modelcontextprotocol/inspector

# Clean 		
clean:
	rm -f *.dxt *.zip
	rm -rf node_modules build

# Proxy for debugging with mitmproxy
proxy:
	mitmweb -p 8888 --mode reverse:http://localhost:8000 --web-port 8081

# SSE server for testing locally
sgw-sse: build-prod install-prod
	npx -y supergateway \
    --stdio "node build/index.js" \
    --port 8000 --baseUrl http://localhost:8000 \
    --ssePath /sse --messagePath /message

# MCP server for testing locally
sgw-mcp: build-prod install-prod
	npx -y supergateway \
	--stdio "node build/index.js" \
    --outputTransport streamableHttp \
    --port 8000

# Help message
help:
	@echo "Usage:"
	@echo "  make all           - Build All"
	@echo "  make install       - Install all dependencies (including dev) with npm ci"
	@echo "  make install-prod  - Install only production dependencies with npm ci"
	@echo "  make build         - Build the Weather MCP server"
	@echo "  make pack          - Pack the MCP server for Claude Desktop"
	@echo "  make test-sse      - Test the SSE server locally"
	@echo "  make clean         - Clean build artifacts"
	@echo "  make proxy         - Start mitmproxy for debugging"
	@echo "  make sgw-sse       - Start Supergateway for SSE"
	@echo "  make sgw-mcp       - Start Supergateway for MCP"
	@echo "  make help          - Show this help message"