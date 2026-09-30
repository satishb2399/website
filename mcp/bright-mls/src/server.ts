/**
 * MCP server wiring: tool registry, JSON Schema generation, dispatch.
 *
 * Kept separate from index.ts so the registry can be imported by tests and by
 * the doctor script without opening a stdio transport.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { BrightClient } from "./client.js";
import type { BrightConfig } from "./config.js";
import { compsTool } from "./tools/comps.js";
import { getListingTool, searchListingsTool } from "./tools/listings.js";
import { marketSnapshotTool } from "./tools/market.js";
import { checkConnectionTool, describeResourceTool, odataQueryTool } from "./tools/raw.js";
import type { ToolContext, ToolDefinition } from "./tools/types.js";

export const TOOLS: ToolDefinition[] = [
  searchListingsTool,
  getListingTool,
  compsTool,
  marketSnapshotTool,
  describeResourceTool,
  odataQueryTool,
  checkConnectionTool,
];

/** Above this, a single tool result is more context than it is worth. */
const MAX_RESULT_CHARS = 250_000;

export const SERVER_NAME = "bright-mls";
export const SERVER_VERSION = "0.1.0";

const INSTRUCTIONS = [
  "Read-only access to the Bright MLS RESO Web API (OData v4) for the Mid-Atlantic, including Cumberland, Dauphin and York counties in Central PA.",
  "",
  "Start with bright_check_connection if anything errors. Use bright_describe_resource before guessing a field name — Bright answers an unknown field with a 400, not an empty result.",
  "bright_comps is the underwriting path: closed sales → median $/sqft → ARV → 70% rule. Its ARV is a screening estimate from unadjusted comps, not an appraisal; say so when you report one.",
  "There is no radius search in the feed; narrow by postal_codes first, then city, then counties.",
  "MLS data is licensed. Follow Bright's API licence and display rules for anything you store or show, and do not republish listing data beyond what that licence allows.",
].join("\n");

export function buildServer(cfg: BrightConfig): Server {
  const ctx: ToolContext = { cfg, client: new BrightClient(cfg) };

  const server = new Server(
    { name: SERVER_NAME, version: SERVER_VERSION },
    { capabilities: { tools: {} }, instructions: INSTRUCTIONS },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: TOOLS.map((tool) => ({
      name: tool.name,
      title: tool.title,
      description: tool.description,
      inputSchema: toInputSchema(tool),
      annotations: { readOnlyHint: true, openWorldHint: true },
    })),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const tool = TOOLS.find((t) => t.name === request.params.name);
    if (!tool) {
      return errorResult(`Unknown tool: ${request.params.name}. Available: ${TOOLS.map((t) => t.name).join(", ")}.`);
    }

    const parsed = tool.schema.safeParse(request.params.arguments ?? {});
    if (!parsed.success) {
      return errorResult(`Invalid arguments for ${tool.name}:\n${formatZodError(parsed.error)}`);
    }

    try {
      const result = await tool.handler(parsed.data, ctx);
      return { content: [{ type: "text" as const, text: serialize(result) }] };
    } catch (err) {
      return errorResult(err instanceof Error ? err.message : String(err));
    }
  });

  return server;
}

/** JSON Schema for tools/list, derived from the same zod schema used to validate. */
export function toInputSchema(tool: ToolDefinition): { type: "object"; [k: string]: unknown } {
  const schema = z.toJSONSchema(tool.schema, { target: "draft-7", io: "input" }) as Record<string, unknown>;
  return { ...schema, type: "object" };
}

function serialize(result: unknown): string {
  const text = JSON.stringify(result, null, 2) ?? "null";
  if (text.length <= MAX_RESULT_CHARS) return text;
  return [
    `// Result truncated: ${text.length} characters exceeds the ${MAX_RESULT_CHARS}-character cap.`,
    "// Re-run with a smaller `limit`, a narrower `fields` list, or a tighter filter.",
    text.slice(0, MAX_RESULT_CHARS),
  ].join("\n");
}

function errorResult(message: string) {
  return { content: [{ type: "text" as const, text: message }], isError: true };
}

function formatZodError(error: z.ZodError): string {
  return error.issues.map((issue) => `- ${issue.path.join(".") || "(root)"}: ${issue.message}`).join("\n");
}
