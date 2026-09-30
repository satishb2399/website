import { z } from "zod";
import { STANDARD_STATUSES } from "../fields.js";
import * as od from "../odata.js";

export const zStatus = z.enum(STANDARD_STATUSES);

export const zFieldList = z
  .array(z.string())
  .min(1)
  .max(200)
  .describe("Explicit RESO field names to return. Overrides the tool's default field set.");

export const zRawFilter = z
  .string()
  .max(4000)
  .describe(
    "Raw OData $filter appended to the generated one with `and`. Use for anything the named parameters don't cover, e.g. \"contains(PublicRemarks,'as-is')\".",
  );

/** Location narrowing shared by the search, comps and market tools. */
export const locationShape = {
  state: z.string().length(2).default("PA").describe("Two-letter state code (StateOrProvince)."),
  city: z.string().max(80).optional().describe("Exact city match (City)."),
  counties: z
    .array(z.string().max(80))
    .max(20)
    .optional()
    .describe('County names without the word "County" — e.g. ["Cumberland","Dauphin","York"] (CountyOrParish).'),
  postal_codes: z
    .array(z.string().regex(/^\d{5}$/))
    .max(50)
    .optional()
    .describe('Five-digit ZIPs (PostalCode) — the tightest area filter Bright exposes without geo, e.g. ["17104","17103"].'),
};

export function locationClauses(args: {
  state?: string;
  city?: string;
  counties?: string[];
  postal_codes?: string[];
}): (string | undefined)[] {
  return [
    args.state ? od.eq("StateOrProvince", args.state.toUpperCase()) : undefined,
    args.city ? od.eq("City", args.city) : undefined,
    args.counties?.length ? od.anyOf("CountyOrParish", args.counties) : undefined,
    args.postal_codes?.length ? od.anyOf("PostalCode", args.postal_codes) : undefined,
  ];
}

/** Today minus `months`, as YYYY-MM-DD. */
export function monthsAgo(months: number, now = new Date()): string {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - months, now.getUTCDate()));
  return d.toISOString().slice(0, 10);
}

export function today(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

/**
 * Bright rejects an unknown field in $select or $filter with a 400 rather than
 * ignoring it, so turn that into an actionable message.
 */
export function withFieldHint(err: unknown): never {
  const message = err instanceof Error ? err.message : String(err);
  if (/\b400\b/.test(message)) {
    throw new Error(
      `${message}\n\nIf this names a property, the field may not exist in Bright's model. ` +
        "Run bright_describe_resource to list the real field names, then pass them via `fields`.",
    );
  }
  throw err instanceof Error ? err : new Error(message);
}
