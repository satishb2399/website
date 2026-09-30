#!/usr/bin/env node
/**
 * Bright MLS MCP server (stdio).
 *
 * Nothing but MCP protocol frames may reach stdout, so every diagnostic goes to
 * stderr.
 */

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ConfigError, loadConfig } from "./config.js";
import { SERVER_NAME, SERVER_VERSION, buildServer } from "./server.js";

async function main(): Promise<void> {
  let cfg;
  try {
    cfg = loadConfig();
  } catch (err) {
    if (err instanceof ConfigError) {
      process.stderr.write(`[${SERVER_NAME}] configuration error: ${err.message}\n`);
      process.exit(78); // EX_CONFIG
    }
    throw err;
  }

  const server = buildServer(cfg);
  await server.connect(new StdioServerTransport());
  process.stderr.write(`[${SERVER_NAME}] v${SERVER_VERSION} ready — env=${cfg.env} root=${cfg.serviceRoot}\n`);
}

main().catch((err: unknown) => {
  process.stderr.write(`[${SERVER_NAME}] fatal: ${err instanceof Error ? (err.stack ?? err.message) : String(err)}\n`);
  process.exit(1);
});
