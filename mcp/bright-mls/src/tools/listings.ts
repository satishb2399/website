import { z } from "zod";
import { COMP_FIELDS, PROPERTY_CORE_FIELDS, PROPERTY_DETAIL_FIELDS } from "../fields.js";
import * as od from "../odata.js";
import { locationClauses, locationShape, withFieldHint, zFieldList, zRawFilter, zStatus } from "./common.js";
import { defineTool } from "./types.js";

const FIELD_SETS = {
  core: PROPERTY_CORE_FIELDS,
  detail: PROPERTY_DETAIL_FIELDS,
  comp: COMP_FIELDS,
} as const;

const searchSchema = z.object({
  ...locationShape,
  status: z
    .array(zStatus)
    .max(11)
    .default(["Active"])
    .describe('StandardStatus values. ["Closed"] for sold data, ["Expired","Canceled","Withdrawn"] for listing-lead sources.'),
  property_type: z
    .string()
    .max(60)
    .optional()
    .describe('RESO PropertyType, e.g. "Residential", "Residential Lease", "Land".'),
  property_sub_type: z
    .array(z.string().max(60))
    .max(20)
    .optional()
    .describe('PropertySubType values, e.g. ["Single Family Residence","Townhouse"].'),
  min_price: z.number().nonnegative().optional().describe("Minimum ListPrice."),
  max_price: z.number().nonnegative().optional().describe("Maximum ListPrice."),
  min_beds: z.number().int().min(0).max(20).optional(),
  min_baths: z.number().int().min(0).max(20).optional().describe("Minimum BathroomsTotalInteger."),
  min_living_area: z.number().nonnegative().optional().describe("Minimum LivingArea in square feet."),
  max_living_area: z.number().nonnegative().optional(),
  min_year_built: z.number().int().min(1700).max(2100).optional(),
  max_year_built: z.number().int().min(1700).max(2100).optional(),
  min_days_on_market: z.number().int().min(0).optional().describe("Stale-inventory filter: DaysOnMarket at or above this."),
  max_days_on_market: z.number().int().min(0).optional(),
  closed_from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .describe('Earliest CloseDate (YYYY-MM-DD). Only meaningful with status ["Closed"].'),
  closed_to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .describe("Latest CloseDate (YYYY-MM-DD)."),
  modified_since: z
    .string()
    .optional()
    .describe("ISO timestamp — returns rows with ModificationTimestamp at or after it. Use for incremental sync."),
  filter: zRawFilter.optional(),
  field_set: z.enum(["core", "detail", "comp"]).default("core").describe("Preset field list. Ignored when `fields` is given."),
  fields: zFieldList.optional(),
  order_by: z.string().max(60).default("ModificationTimestamp").describe("Field to sort by."),
  order: z.enum(["asc", "desc"]).default("desc"),
  limit: z.number().int().min(1).max(1000).default(25).describe("Maximum rows to return."),
  include_count: z.boolean().default(false).describe("Also return the server-side total match count ($count)."),
});

export const searchListingsTool = defineTool({
  name: "bright_search_listings",
  title: "Search Bright MLS listings",
  description:
    "Query the Bright MLS Property resource with named filters (area, status, price, size, age, days on market). " +
    "Use it for active inventory, closed sales, and expired/withdrawn listing-lead pulls. Read-only.",
  schema: searchSchema,
  handler: async (args, { client }) => {
    const filter = od.and([
      ...locationClauses(args),
      args.status.length ? od.anyOf("StandardStatus", args.status) : undefined,
      args.property_type ? od.eq("PropertyType", args.property_type) : undefined,
      args.property_sub_type?.length ? od.anyOf("PropertySubType", args.property_sub_type) : undefined,
      ...od.numRange("ListPrice", args.min_price, args.max_price),
      args.min_beds !== undefined ? od.cmp("BedroomsTotal", "ge", od.num(args.min_beds)) : undefined,
      args.min_baths !== undefined ? od.cmp("BathroomsTotalInteger", "ge", od.num(args.min_baths)) : undefined,
      ...od.numRange("LivingArea", args.min_living_area, args.max_living_area),
      ...od.numRange("YearBuilt", args.min_year_built, args.max_year_built),
      ...od.numRange("DaysOnMarket", args.min_days_on_market, args.max_days_on_market),
      ...od.dateRange("CloseDate", args.closed_from, args.closed_to),
      args.modified_since ? od.cmp("ModificationTimestamp", "ge", od.dateTimeLiteral(args.modified_since)) : undefined,
      args.filter,
    ]);

    const select = args.fields ?? [...FIELD_SETS[args.field_set]];

    try {
      const result = await client.getCollection("Property", {
        filter,
        select,
        orderby: od.orderBy(args.order_by, args.order),
        top: args.limit,
        count: args.include_count,
      });

      return {
        returned: result.rows.length,
        total_matching: result.totalCount,
        truncated: result.truncated,
        filter,
        request_url: result.requestUrl,
        listings: result.rows,
      };
    } catch (err) {
      return withFieldHint(err);
    }
  },
});

const getSchema = z.object({
  listing_key: z.string().max(64).optional().describe("Bright ListingKey (the OData entity key)."),
  listing_id: z.string().max(64).optional().describe('Public MLS number (ListingId), e.g. "PACB1234567".'),
  fields: zFieldList.optional().describe("Defaults to the detail field set. Pass [\"*\"] to return every field Bright sends."),
});

export const getListingTool = defineTool({
  name: "bright_get_listing",
  title: "Get one Bright MLS listing",
  description:
    "Fetch a single listing by ListingKey (direct entity read) or by ListingId / MLS number (filtered read). " +
    'Pass fields: ["*"] for the full Bright payload — large, so prefer the default field set.',
  schema: getSchema,
  handler: async (args, { client }) => {
    if (!args.listing_key && !args.listing_id) {
      throw new Error("Provide listing_key or listing_id.");
    }
    const wantsEverything = args.fields?.length === 1 && args.fields[0] === "*";
    const select = wantsEverything ? undefined : (args.fields ?? [...PROPERTY_DETAIL_FIELDS]);

    try {
      if (args.listing_key) {
        const row = await client.getEntityByKey("Property", args.listing_key, select);
        return row ? { found: true, listing: row } : { found: false, reason: `No Property with ListingKey ${args.listing_key}.` };
      }

      const result = await client.getCollection("Property", {
        filter: od.eq("ListingId", args.listing_id!),
        select,
        top: 1,
      });
      const listing = result.rows[0];
      return listing ? { found: true, listing } : { found: false, reason: `No Property with ListingId ${args.listing_id}.` };
    } catch (err) {
      return withFieldHint(err);
    }
  },
});
