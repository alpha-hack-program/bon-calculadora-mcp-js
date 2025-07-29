# BON Calculadora MCP Server 🌤️

[![Build Status](https://github.com/alpha-hack-program/bon-calculadora-mcp-js/workflows/CI/badge.svg)](https://github.com/alpha-hack-program/bon-calculadora-mcp-js/actions)
[![Container Registry](https://img.shields.io/badge/container-quay.io-red)](https://quay.io/repository/atarazana/bon-calculadora-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-%230074c1.svg)](https://www.typescriptlang.org/)
[![MCP Guide](https://img.shields.io/badge/MCP-Official%20Guide-blue)](https://modelcontextprotocol.io/quickstart/server)

A production-ready Model Context Protocol (MCP) server for...


https://www.navarra.es/es/tramites/on/-/line/ayudas-a-personas-trabajadoras-en-excedencia-para-cuidado-de-familiares





¿Qué hacemos cuando un sistema RAG con modelos pequeños no alcanza nuestras expectativas? ¿Abandonar? ¿Gastár más? ¿O buscar alternativas eficientes basadas en agentes? Ven a esta sesión donde veremos como resolver con agentes (Llama Stack) sobre Red Hat AI problemas aparentemente sencillos pero que RAG no puede resolver por sí mismo.


Partiremos de un caso trivial en principio pero que un RAG no soluciona porque requeriría un LLM muy "inteligente" y por tanto caro. Con Red Hat AI veremos como este problema se puede resolver aplicando la máxima de divide y venceras. Para ello exploraremos una solución basada en Llama Stack sobre Red Hat AI donde el problema se divide en recuperación de información relevante (RAG), capacidad de comprender el lenguaje natural (LLM) y por último capacidad de cálculo complejo y acceso a sistemas externos (agentes). Al final de la sesión habréis comprendido la problemática que resuelven los agentes, los protocolos detrás del telón (MCP),  cómo se trabaja en un proyecto de este estilo, la arquitectura de agentes sobre Red Hat AI y como desplegarla de forma eficiente en Red Hat OpenShift.



## 🚀 Features

TODO

- **Real-time BON Calculadora Data**: Get current bon-calculadora conditions and forecasts
- **BON Calculadora Alerts**: Receive bon-calculadora alerts for US states
- **MCP Compatible**: Full Model Context Protocol implementation following the official guide
- **Production Ready**: Container support with multi-stage builds
- **Beyond Claude Desktop**: Extended deployment options beyond the basic tutorial
- **Developer Friendly**: TypeScript with comprehensive tooling
- **Multiple Transports**: Stdio, SSE, and HTTP support via supergateway
- **DXT Package Support**: Generate deployment packages for easy Claude Desktop integration

## 🎯 About This Project

This project starts with the [official MCP server quickstart guide](https://modelcontextprotocol.io/quickstart/server) and extends it with production-grade features:

- **Enterprise Deployment**: Containerization with Red Hat UBI images
- **Production Builds**: Optimized builds with proper dependency management
- **DXT Packaging**: Simplified deployment packages for Claude Desktop
- **Multiple Transports**: Beyond stdio to include web interfaces
- **CI/CD Ready**: GitHub Actions and container registry integration
- **Development Tools**: Enhanced debugging and testing capabilities

If you're following the official MCP guide, this repository shows you how to take your bon-calculadora server to production.

## 📦 Installation

### Prerequisites

- Node.js 20+ with npm
- TypeScript 5.x
- Docker/Podman (for containerized deployment)

### Local Development

```bash
# Clone the repository
git clone https://github.com/alpha-hack-program/bon-calculadora-mcp-js.git
cd bon-calculadora-mcp-js

# Install dependencies
make install

# Build the project
make build

# Test the server
make test-stdio
```

### Using with Claude Desktop

#### Method 1: Quick Setup with DXT Package (Recommended)

Create a deployment package for easy Claude Desktop integration:

```bash
# Create a DXT deployment package
make pack
```

This creates a `bon-calculadora-mcp.dxt` file containing:
- Compiled JavaScript code
- Production dependencies only
- Ready-to-use configuration
- Installation instructions

**To install the DXT package:**

TODO


## 🛠️ Usage

TODO

### Available Tools

The weather MCP server provides the following tools:

#### `get_forecast`
Get weather forecast for a specific location.

```json
{
  "name": "get_forecast",
  "arguments": {
    "latitude": 40.7128,
    "longitude": -74.0060
  }
}
```

#### `get_alerts`
Get weather alerts for a US state.

```json
{
  "name": "get_alerts",
  "arguments": {
    "state": "CA"
  }
}
```

### Testing with MCP Inspector

```bash
# Start the MCP Inspector for interactive testing
make test-inspector

# Or test the stdio transport directly
make test-stdio
```

The inspector will open a web interface at `http://localhost:5173` where you can interact with the server.

## 🐳 Container Deployment

### Building Container Images

```bash
# Make the image script executable
chmod +x image.sh

# Build the container image
./image.sh build

# Push to registry
./image.sh push

# Run locally
./image.sh run

# Run from remote registry
./image.sh run-remote
```

### Environment Configuration

The container build uses environment variables from `.env`:

```bash
# Container configuration
BASE_TAG="9.6"
BASE_IMAGE="registry.access.redhat.com/ubi9/nodejs-22-minimal"
CACHE_FLAG=""

# Registry settings
ORG=atarazana
REGISTRY=quay.io/${ORG}

# Application
APP_NAME=weather-mcp
```

### Container Usage

```bash
# Run with Docker/Podman
docker run -it quay.io/atarazana/weather-mcp:latest

# Or with supergateway for web access
docker run -p 3000:3000 -it quay.io/atarazana/weather-mcp:latest
```

## 🧪 Development

### Project Structure

```
weather-mcp-js/
├── src/
│   └── index.ts          # Main server implementation
├── build/                # Compiled JavaScript output
├── Containerfile         # Container build definition
├── image.sh             # Container management script
├── tsconfig.json        # TypeScript configuration
├── package.json         # Node.js dependencies and scripts
├── Makefile            # Build automation
└── .env                # Environment configuration
```

### Available Make Targets

```bash
# Development
make install           # Install dependencies
make build            # Build TypeScript
make clean            # Clean build artifacts

# Testing
make test-stdio       # Test stdio transport
make test-inspector   # Test with MCP Inspector
make test-sse         # Test SSE transport

# Production
make pack             # Create DXT deployment package
make build-prod       # Production build only

# Container Management
make docker-build     # Build container image
make docker-push      # Push to registry
make docker-run       # Run container locally
make docker-clean     # Clean up containers
```

### Build Automation

The project uses Make for consistent build automation following enterprise practices:

```bash
# Quick development cycle
make clean build test-stdio

# Production deployment
make pack

# Container workflow
make docker-build docker-push
```

## 🔧 Configuration

### Environment Variables

- `NODE_ENV`: Set to `production` for production builds
- `LOG_LEVEL`: Logging level (`debug`, `info`, `warn`, `error`)

### TypeScript Configuration

The project uses modern TypeScript with ES modules:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "outDir": "./build",
    "rootDir": "./src",
    "strict": true
  }
}
```

## 🚀 Deployment Options

### 1. DXT Package Deployment (Recommended for Claude Desktop)

The easiest way to deploy for Claude Desktop:

```bash
# Create deployment package
make pack

# This generates weather-mcp.dxt containing:
# - Compiled JavaScript
# - Production dependencies
# - Installation instructions
```

Extract and configure in Claude Desktop:
```bash
tar -xzf weather-mcp.dxt
# Then update claude_desktop_config.json with the extracted path
```

### 2. Direct Node.js Deployment

For development or custom deployments:

```bash
# Production build
make build-prod

# Run directly
node build/index.js
```

### 3. Container Deployment

Enterprise container deployment:

```bash
# Build and run container
make docker-build
make docker-run
```

### 4. Web Interface with Supergateway

Beyond the official MCP guide - serve via HTTP/SSE:

```bash
# Install supergateway globally
npm install -g supergateway

# Build and serve with web interface
make build
supergateway --stdio "node build/index.js"
```

This enables web-based interaction and testing beyond Claude Desktop integration.

## 📚 API Reference

### MCP Protocol

This server implements the Model Context Protocol specification:

- **Initialize**: Establishes connection and capabilities
- **Tools**: Provides weather-related tools
- **Tool Calls**: Executes weather data requests

### Tool Schemas

All tools use JSON Schema for input validation:

```typescript
// Forecast tool schema
{
  type: "object",
  properties: {
    latitude: { type: "number", minimum: -90, maximum: 90 },
    longitude: { type: "number", minimum: -180, maximum: 180 }
  },
  required: ["latitude", "longitude"]
}

// Alerts tool schema
{
  type: "object",
  properties: {
    state: { type: "string", minLength: 2, maxLength: 2 }
  },
  required: ["state"]
}
```

## 🤝 Contributing

We welcome contributions! This project extends the [official MCP quickstart guide](https://modelcontextprotocol.io/quickstart/server) with production features.

### Development Setup

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Build and test: `make clean build test-stdio`
5. Test with the inspector: `make test-inspector`
6. Create a deployment package: `make pack`
7. Commit your changes: `git commit -m 'Add amazing feature'`
8. Push to the branch: `git push origin feature/amazing-feature`
9. Open a Pull Request

### Code Style

- Follow the [official MCP guide](https://modelcontextprotocol.io/quickstart/server) patterns
- Use TypeScript strict mode
- Follow ESLint configuration
- Add JSDoc comments for public APIs
- Write meaningful commit messages
- Test both stdio and web transports

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Model Context Protocol](https://modelcontextprotocol.io/) for the official specification and quickstart guide
- [MCP Server Quickstart](https://modelcontextprotocol.io/quickstart/server) - the foundation of this project
- [Anthropic](https://www.anthropic.com/) for Claude Desktop integration and MCP development
- [Alpha Hack Program](https://github.com/alpha-hack-program) for supporting production-grade MCP implementations

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/alpha-hack-program/weather-mcp-js/issues)
- **Discussions**: [GitHub Discussions](https://github.com/alpha-hack-program/weather-mcp-js/discussions)
- **Official MCP Guide**: [MCP Server Quickstart](https://modelcontextprotocol.io/quickstart/server)
- **MCP Documentation**: [Model Context Protocol Docs](https://modelcontextprotocol.io/docs/)

## 🔄 Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history and updates.

---

<p align="center">
  <strong>Built with ❤️ extending the official MCP guide for production use</strong><br>
  <em>From <a href="https://modelcontextprotocol.io/quickstart/server">tutorial</a> to production-ready deployment</em>
</p>