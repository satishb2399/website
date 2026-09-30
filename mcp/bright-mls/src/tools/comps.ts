import { z } from "zod";
import { compStats, estimateArv, MAO_PERCENT, maxAllowableOffer } from "../analytics.js";
import { COMP_FIELDS } from "../fields.js";
import * as od from "../odata.js";
import { locationClauses, locationShape, monthsAgo, today, withFieldHint, zRawFilter } from "./common.js";
import { defineTool } from "./types.js";

const compsSchema = z.object({
  ...locationShape,
  subject_living_area: z
    .number()
    .positive()
    .optional()
    .describe("Subject's finished square feet. Required for an ARV figure; also centres the comp size window."),
  subject_beds: z.number().int().min(0).max(20).optional(),
  subject_year_built: z.number().int().min(1700).max(2100).optional(),
  property_sub_type: z
    .array(z.string().max(60))
    .max(20)
    .optional()
    .describe('Restrict comps to like kind, e.g. ["Single Family Residence"].'),
  closed_within_months: z.number().int().min(1).max(36).default(6).describe("How far back to pull closed sales."),
  living_area_tolerance_pct: z
    .number()
    .min(5)
    .max(100)
    .default(20)
    .describe("Size window around subject_living_area, as a percentage."),
  beds_tolerance: z.number().int().min(0).max(5).default(1).describe("± bedrooms around subject_beds."),
  year_built_tolerance: z.number().int().min(0).max(100).default(20).describe("± years around subject_year_built."),
  min_price: z.number().nonnegative().optional().describe("Floor on ClosePrice — use to drop teardown/non-arm's-length sales."),
  max_price: z.number().nonnegative().optional(),
  rehab_cost: z.number().nonnegative().default(0).describe("Estimated renovation cost, fed into the 70% rule."),
  mao_percent: z
    .number()
    .min(0.4)
    .max(1)
    .default(MAO_PERCENT)
    .describe("MAO multiplier. 0.70 is the house rule (CLAUDE.md §6)."),
  limit: z.number().int().min(1).max(200).default(30).describe("Maximum comps to pull."),
  filter: zRawFilter.optional(),
});

export const compsTool = defineTool({
  name: "bright_comps",
  title: "Pull closed comps and underwrite",
  description:
    "Pull closed Bright MLS sales around a subject property, summarise them (median close price, $/sqft, days on market, " +
    "close-to-list ratio), estimate ARV from median $/sqft, and apply the 70% rule to get a max allowable offer. " +
    "Area comes from postal_codes / city / counties — Bright's RESO feed has no radius search, so ZIPs are the tightest handle. " +
    "The ARV is a screening number from unadjusted comps, not an appraisal.",
  schema: compsSchema,
  handler: async (args, { client }) => {
    if (!args.postal_codes?.length && !args.city && !args.counties?.length) {
      throw new Error("Give an area: postal_codes (best), city, or counties.");
    }

    const closedFrom = monthsAgo(args.closed_within_months);
    const closedTo = today();

    const areaMin = args.subject_living_area
      ? Math.round(args.subject_living_area * (1 - args.living_area_tolerance_pct / 100))
      : undefined;
    const areaMax = args.subject_living_area
      ? Math.round(args.subject_living_area * (1 + args.living_area_tolerance_pct / 100))
      : undefined;

    const filter = od.and([
      ...locationClauses(args),
      od.eq("StandardStatus", "Closed"),
      ...od.dateRange("CloseDate", closedFrom, closedTo),
      args.property_sub_type?.length ? od.anyOf("PropertySubType", args.property_sub_type) : undefined,
      ...od.numRange("LivingArea", areaMin, areaMax),
      ...(args.subject_beds !== undefined
        ? od.numRange(
            "BedroomsTotal",
            Math.max(0, args.subject_beds - args.beds_tolerance),
            args.subject_beds + args.beds_tolerance,
          )
        : []),
      ...(args.subject_year_built !== undefined
        ? od.numRange(
            "YearBuilt",
            args.subject_year_built - args.year_built_tolerance,
            args.subject_year_built + args.year_built_tolerance,
          )
        : []),
      ...od.numRange("ClosePrice", args.min_price, args.max_price),
      args.filter,
    ]);

    let rows;
    try {
      const result = await client.getCollection("Property", {
        filter,
        select: [...COMP_FIELDS],
        orderby: od.orderBy("CloseDate", "desc"),
        top: args.limit,
      });
      rows = result.rows;
    } catch (err) {
      return withFieldHint(err);
    }

    const stats = compStats(rows);
    const arv = estimateArv(args.subject_living_area, stats);

    const comps = rows.map((row) => {
      const price = Number(row.ClosePrice);
      const area = Number(row.LivingArea);
      return {
        ...row,
        PricePerSqFt:
          Number.isFinite(price) && price > 0 && Number.isFinite(area) && area > 0
            ? Math.round((price / area) * 100) / 100
            : null,
      };
    });

    return {
      subject: {
        area: args.postal_codes?.length
          ? { postal_codes: args.postal_codes }
          : args.city
            ? { city: args.city, state: args.state }
            : { counties: args.counties, state: args.state },
        living_area: args.subject_living_area ?? null,
        beds: args.subject_beds ?? null,
        year_built: args.subject_year_built ?? null,
      },
      window: { closed_from: closedFrom, closed_to: closedTo, living_area: areaMin ? [areaMin, areaMax] : null },
      comps_returned: comps.length,
      stats,
      arv_estimate: arv,
      underwriting:
        arv.arv !== undefined
          ? {
              arv: arv.arv,
              rehab_cost: args.rehab_cost,
              mao_percent: args.mao_percent,
              max_allowable_offer: maxAllowableOffer(arv.arv, args.rehab_cost, args.mao_percent),
              formula: `(${args.mao_percent} × ARV) − rehab`,
            }
          : { note: "No MAO computed — ARV could not be estimated. See arv_estimate.notes." },
      filter,
      comps,
    };
  },
});
