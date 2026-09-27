import { spawn } from "node:child_process";
import readline from "node:readline";
import { McpServer, fromJsonSchema } from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";

const cmd = process.env.LEGACY_MCP_COMMAND || "terraform-mcp-server";
const args = JSON.parse(process.env.LEGACY_MCP_ARGS || "[\"--toolsets=registry\"]");
const serverName = process.env.BRIDGE_SERVER_NAME || "terraform-registry-modern";
const serverVersion = process.env.BRIDGE_SERVER_VERSION || "1.3.0-bridge1";

class LegacyClient {
  constructor() {
    this.nextId = 1;
    this.pending = new Map();
  }

  async start() {
    this.child = spawn(cmd, args, { stdio: ["pipe", "pipe", "pipe"], env: process.env });
    this.child.stderr.on("data", d => process.stderr.write("[legacy] " + d));
    this.child.on("exit", (code, signal) => {
      const err = new Error("legacy MCP exited code=" + code + " signal=" + signal);
      for (const { reject } of this.pending.values()) reject(err);
      this.pending.clear();
      process.exit(code || 1);
    });

    const rl = readline.createInterface({ input: this.child.stdout });
    rl.on("line", line => {
      if (!line.trim()) return;
      let msg;
      try { msg = JSON.parse(line); } catch { return; }
      if (msg.id !== undefined && this.pending.has(msg.id)) {
        const p = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) p.reject(new Error(JSON.stringify(msg.error)));
        else p.resolve(msg.result);
      }
    });

    await this.request("initialize", {
      protocolVersion: "2025-11-25",
      capabilities: {},
      clientInfo: { name: "ca-mcp-legacy-v2-bridge", version: "1" }
    });
    this.notify("notifications/initialized", {});
  }

  request(method, params = {}) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.child.stdin.write(JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n");
    });
  }

  notify(method, params = {}) {
    this.child.stdin.write(JSON.stringify({ jsonrpc: "2.0", method, params }) + "\n");
  }
}

const legacy = new LegacyClient();
await legacy.start();
const listed = await legacy.request("tools/list", {});
const toolList = listed?.tools || [];
if (!toolList.length) throw new Error("legacy tools/list returned no tools");

function makeServer() {
  const server = new McpServer(
    { name: serverName, version: serverVersion },
    { capabilities: { tools: { listChanged: false } } }
  );

  for (const tool of toolList) {
    const config = {
      description: tool.description,
      inputSchema: fromJsonSchema(tool.inputSchema || { type: "object", properties: {} }),
      annotations: tool.annotations || {}
    };
    if (tool.title) config.title = tool.title;
    if (tool.outputSchema) config.outputSchema = fromJsonSchema(tool.outputSchema);

    server.registerTool(tool.name, config, async input => {
      return await legacy.request("tools/call", {
        name: tool.name,
        arguments: input || {}
      });
    });
  }
  return server;
}

console.error("[bridge] imported_tools=" + toolList.length + " names=" + toolList.map(t => t.name).sort().join(","));
await serveStdio(() => makeServer());
