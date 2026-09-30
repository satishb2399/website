import { z } from "zod";
import { describeConfig } from "../config.js";
import { fieldsForEntitySet, getSchema, partitionKnownFields } from "../metadata.js";
import * as od from "../odata.js";
import { defineTool } from "./types.js";

const querySchema = z.object({
  resource: z
    .string()
    .regex(/^[A-Za-z][A-Za-z0-9]*$/)
    .describe('RESO entity set, e.g. "Property", "Member", "Office", "Media", "OpenHouse". List them with bright_describe_resource.'),
  filter: z.string().max(4000).optional().describe("Raw OData $filter."),
  select: z.array(z.string()).max(200).optional().describe("Fields to return ($select)."),
  orderby: z.string().max(200).optional().describe('e.g. "ModificationTimestamp desc".'),
  top: z.number().int().min(1).max(1000).default(25).describe("Row limit ($top)."),
  skip: z.number().int().min(0).optional().describe("Rows to skip ($skip)."),
  expand: z.string().max(200).optional().describe('$expand, e.g. "Media".'),
  count: z.boolean().default(false).describe("Include the server-side total ($count)."),
  max_pages: z.number().int().min(1).max(20).default(1).describe("How many @odata.nextLink pages to follow."),
});

export const odataQueryTool = defineTool({
  name: "bright_odata_query",
  title: "Raw Bright MLS OData query",
  description:
    "Escape hatch: issue an arbitrary read against any Bright RESO entity set with raw OData parameters. " +
    "Use when the named tools don't cover the query. GET only — this server never writes.",
  schema: querySchema,
  handler: async (args, { client }) => {
    const result = await client.getCollection(
      args.resource,
      {
        filter: args.filter,
        select: args.select,
        orderby: args.orderby,
        top: args.top,
        skip: args.skip,
        expand: args.expand,
        count: args.count,
      },
      { maxPages: args.max_pages },
    );

    return {
      resource: args.resource,
      returned: result.rows.length,
      total_matching: result.totalCount,
      pages_fetched: result.pagesFetched,
      truncated: result.truncated,
      request_url: result.requestUrl,
      rows: result.rows,
    };
  },
});

const describeSchema = z.object({
  resource: z
    .string()
    .regex(/^[A-Za-z][A-Za-z0-9]*$/)
    .optional()
    .describe("Entity set to describe. Omit to list every entity set Bright exposes to your credentials."),
  contains: z
    .string()
    .max(60)
    .optional()
    .describe('Case-insensitive substring filter on field names, e.g. "Price", "Tax", "Bright".'),
  check_fields: z
    .array(z.string())
    .max(200)
    .optional()
    .describe("Field names to verify against the live schema; returns which exist and which don't."),
  refresh: z.boolean().default(false).describe("Re-fetch $metadata instead of using the cached copy."),
});

export const describeResourceTool = defineTool({
  name: "bright_describe_resource",
  title: "Describe Bright MLS schema",
  description:
    "Read Bright's live $metadata: list entity sets, or list a resource's real field names and types. " +
    "Use this before guessing a field — Bright rejects an unknown field with a 400 rather than ignoring it.",
  schema: describeSchema,
  handler: async (args, { client }) => {
    const schema = await getSchema(client, args.refresh);

    if (!args.resource) {
      return {
        fetched_at: schema.fetchedAt,
        entity_sets: Object.keys(schema.entitySets).sort(),
        hint: "Call again with resource set to one of these to see its fields.",
      };
    }

    const properties = fieldsForEntitySet(schema, args.resource);
    if (!properties) {
      return {
        found: false,
        reason: `No entity set named ${args.resource}.`,
        entity_sets: Object.keys(schema.entitySets).sort(),
      };
    }

    const needle = args.contains?.toLowerCase();
    const filtered = needle ? properties.filter((p) => p.name.toLowerCase().includes(needle)) : properties;

    return {
      found: true,
      resource: args.resource,
      entity_type: schema.entitySets[args.resource],
      field_count: properties.length,
      returned: filtered.length,
      fetched_at: schema.fetchedAt,
      field_check: args.check_fields?.length ? partitionKnownFields(properties, args.check_fields) : undefined,
      fields: filtered.map((p) => ({ name: p.name, type: p.type, nullable: p.nullable })),
    };
  },
});

export const checkConnectionTool = defineTool({
  name: "bright_check_connection",
  title: "Check Bright MLS connectivity",
  description:
    "Verify configuration, OAuth token issuance and a one-row read against the Property resource. " +
    "Run this first when a call fails — it separates a credential problem from a query problem. Never echoes the client secret.",
  schema: z.object({}),
  handler: async (_args, { client, cfg }) => {
    const config = describeConfig(cfg);
    try {
      const probe = await client.getCollection("Property", {
        select: ["ListingKey", "ModificationTimestamp"],
        orderby: od.orderBy("ModificationTimestamp", "desc"),
        top: 1,
      });
      return {
        ok: true,
        config,
        probe: {
          rows_returned: probe.rows.length,
          newest_modification_timestamp: probe.rows[0]?.ModificationTimestamp ?? null,
        },
      };
    } catch (err) {
      return {
        ok: false,
        config,
        error: err instanceof Error ? err.message : String(err),
        next_steps: [
          "401/invalid_client: check BRIGHT_MLS_CLIENT_ID / BRIGHT_MLS_CLIENT_SECRET and that they match BRIGHT_MLS_ENV (test credentials do not work against production).",
          "400 invalid_scope: Bright issued a scope your app must request — set BRIGHT_MLS_SCOPE.",
          "403: the credentials authenticated but your data licence may not cover this resource — contact data-support@brightmls.com.",
        ],
      };
    }
  },
});
