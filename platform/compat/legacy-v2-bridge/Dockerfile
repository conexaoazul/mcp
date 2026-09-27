FROM hashicorp/terraform-mcp-server@sha256:423a6b8e2ee06affcf090892f40c86469caba45fd2448ffa8ca5d717a174f7d5 AS terraform

FROM node:22-alpine
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev --silent \
 && npm install -g --silent supergateway@4.0.0 \
 && npm cache clean --force
COPY index.mjs ./
COPY --from=terraform /bin/terraform-mcp-server /usr/local/bin/terraform-mcp-server
ENV LEGACY_MCP_COMMAND=terraform-mcp-server \
    LEGACY_MCP_ARGS='["--toolsets=registry"]' \
    BRIDGE_SERVER_NAME=terraform-registry-modern \
    BRIDGE_SERVER_VERSION=1.3.0-bridge1
EXPOSE 8080
ENTRYPOINT ["supergateway"]
CMD ["--stdio","node /app/index.mjs","--outputTransport","streamableHttp","--port","8080","--streamableHttpPath","/terraform/mcp","--healthEndpoint","/terraform/health"]
