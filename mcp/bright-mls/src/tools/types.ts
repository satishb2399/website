import type { z } from "zod";
import type { BrightClient } from "../client.js";
import type { BrightConfig } from "../config.js";

export interface ToolContext {
  client: BrightClient;
  cfg: BrightConfig;
}

export interface ToolDefinition<S extends z.ZodType = z.ZodType> {
  name: string;
  title: string;
  description: string;
  schema: S;
  /** Returns a JSON-serialisable result; the server wraps it as MCP content. */
  handler: (args: z.output<S>, ctx: ToolContext) => Promise<unknown>;
}

export function defineTool<S extends z.ZodType>(def: ToolDefinition<S>): ToolDefinition<z.ZodType> {
  return def as unknown as ToolDefinition<z.ZodType>;
}
