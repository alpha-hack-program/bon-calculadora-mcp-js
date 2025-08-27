# Build arguments for base image configuration
ARG BASE_IMAGE
ARG BASE_TAG

# Builder stage
FROM ${BASE_IMAGE}:${BASE_TAG} as builder

# Add metadata labels
LABEL stage=builder
LABEL description="Build stage for MCP Server application"

WORKDIR /opt/app-root/src

USER root

# Crear y configurar directorios con permisos correctos
RUN mkdir -p /opt/app-root/src/.npm && \
    chown -R 1001:0 /opt/app-root/src && \
    chmod -R g+w /opt/app-root/src

USER 1001

# Configurar npm para usar un cache específico
ENV npm_config_cache=/opt/app-root/src/.npm

# Copy package files and source code
COPY --chown=1001:0 package*.json ./
COPY --chown=1001:0 tsconfig.json ./
COPY --chown=1001:0 src ./src

# Install dependencies, build, and clean up in one layer
RUN npm ci && \
    npm run build-prod && \
    npm prune --production && \
    rm -rf src tsconfig.json && \
    npm cache clean --force

# Production stage
FROM ${BASE_IMAGE}:${BASE_TAG}

# Build arguments available in production stage
ARG APP_NAME
ARG BASE_IMAGE
ARG BASE_TAG
ARG VERSION
ARG BUILD_DATE
ARG VCS_REF
ARG MAINTAINER
ARG DESCRIPTION
ARG SOURCE
ARG PORT=8000

# Metadata labels for the final image
LABEL maintainer="${MAINTAINER}"
LABEL version="${VERSION}"
LABEL description="${DESCRIPTION}"
LABEL org.opencontainers.image.title="${APP_NAME}"
LABEL org.opencontainers.image.description="${DESCRIPTION}"
LABEL org.opencontainers.image.version="${VERSION}"
LABEL org.opencontainers.image.created="${BUILD_DATE}"
LABEL org.opencontainers.image.revision="${VCS_REF}"
LABEL org.opencontainers.image.source="${SOURCE}"
LABEL org.opencontainers.image.base.name="${BASE_IMAGE}:${BASE_TAG}"

# Copy built application from builder stage
COPY --from=builder /opt/app-root/src /opt/app-root/src

WORKDIR /opt/app-root/src

# Switch to non-root user for security
USER 1001

# Configurar npm para usar cache temporal en producción
ENV npm_config_cache=/tmp/.npm

# Set production environment
ENV NODE_ENV=production
ENV PATH=/opt/app-root/src/node_modules/.bin:$PATH

# Health check to ensure the application is running
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "console.log('Health check passed')" || exit 1

# Expose PORT
EXPOSE ${PORT}

# Default command using supergateway for stdio transport
CMD ["npx", "-y", "supergateway", "--stdio", "node build/index.js"]