import { z } from "zod";
import { compStats } from "../analytics.js";
import { COMP_FIELDS } from "../fields.js";
import * as od from "../odata.js";
import { locationClauses, locationShape, monthsAgo, today, withFieldHint } from "./common.js";
import { defineTool } from "./types.js";

const ACTIVE_FIELDS = ["ListingKey", "ListPrice", "DaysOnMarket", "LivingArea", "BedroomsTotal", "PostalCode"] as const;

const snapshotSchema = z.object({
  ...locationShape,
  property_type: z.string().max(60).default("Residential").describe("RESO PropertyType."),
  property_sub_type: z.array(z.string().max(60)).max(20).optional(),
  months: z.number().int().min(1).max(24).default(12).describe("Look-back window for closed sales."),
  min_price: z.number().nonnegative().optional(),
  max_price: z.number().nonnegative().optional(),
  sample_limit: z
    .number()
    .int()
    .min(50)
    .max(1000)
    .default(500)
    .describe("Row cap per side. Medians come from this sample; the counts are server-side totals."),
});

export const marketSnapshotTool = defineTool({
  name: "bright_market_snapshot",
  title: "Market snapshot for an area",
  description:
    "Active inventory vs. closed sales for an area over a look-back window: counts, median prices, median days on market, " +
    "close-to-list ratio, absorption rate and months of supply. Counts are server-side totals; medians are from a capped sample.",
  schema: snapshotSchema,
  handler: async (args, { client }) => {
    if (!args.postal_codes?.length && !args.city && !args.counties?.length) {
      throw new Error("Give an area: postal_codes, city, or counties.");
    }

    const closedFrom = monthsAgo(args.months);
    const closedTo = today();

    const base = [
      ...locationClauses(args),
      od.eq("PropertyType", args.property_type),
      args.property_sub_type?.length ? od.anyOf("PropertySubType", args.property_sub_type) : undefined,
    ];

    const activeFilter = od.and([...base, od.eq("StandardStatus", "Active"), ...od.numRange("ListPrice", args.min_price, args.max_price)]);
    const closedFilter = od.and([
      ...base,
      od.eq("StandardStatus", "Closed"),
      ...od.dateRange("CloseDate", closedFrom, closedTo),
      ...od.numRange("ClosePrice", args.min_price, args.max_price),
    ]);

    try {
      const [active, closed] = await Promise.all([
        client.getCollection("Property", {
          filter: activeFilter,
          select: [...ACTIVE_FIELDS],
          orderby: od.orderBy("ListPrice", "asc"),
          top: args.sample_limit,
          count: true,
        }),
        client.getCollection("Property", {
          filter: closedFilter,
          select: [...COMP_FIELDS],
          orderby: od.orderBy("CloseDate", "desc"),
          top: args.sample_limit,
          count: true,
        }),
      ]);

      const activeStats = compStats(active.rows);
      const closedStats = compStats(closed.rows);

      const activeTotal = active.totalCount ?? active.rows.length;
      const closedTotal = closed.totalCount ?? closed.rows.length;
      const salesPerMonth = closedTotal / args.months;
      const monthsOfSupply = salesPerMonth > 0 ? Math.round((activeTotal / salesPerMonth) * 10) / 10 : null;

      return {
        area: args.postal_codes?.length
          ? { postal_codes: args.postal_codes }
          : args.city
            ? { city: args.city, state: args.state }
            : { counties: args.counties, state: args.state },
        window: { from: closedFrom, to: closedTo, months: args.months },
        active: {
          total: activeTotal,
          sampled: active.rows.length,
          median_list_price: activeStats.listPrice.median,
          median_days_on_market: activeStats.daysOnMarket.median,
          median_price_per_sqft: activeStats.pricePerSqFt.median ?? null,
        },
        closed: {
          total: closedTotal,
          sampled: closed.rows.length,
          median_close_price: closedStats.closePrice.median,
          median_days_on_market: closedStats.daysOnMarket.median,
          median_price_per_sqft: closedStats.pricePerSqFt.median,
          close_to_list_pct: closedStats.closeToListPct,
        },
        absorption: {
          sales_per_month: Math.round(salesPerMonth * 10) / 10,
          months_of_supply: monthsOfSupply,
          reading:
            monthsOfSupply === null
              ? "no closed sales in the window"
              : monthsOfSupply < 4
                ? "seller's market"
                : monthsOfSupply > 6
                  ? "buyer's market"
                  : "balanced",
        },
        notes: [
          "Active $/sqft is computed from ListPrice (asking), closed $/sqft from ClosePrice (achieved) — underwrite off the closed figure.",
          "Medians come from a capped sample ordered by price (active) and close date (closed) — widen sample_limit for a fuller picture.",
        ],
        filters: { active: activeFilter, closed: closedFilter },
      };
    } catch (err) {
      return withFieldHint(err);
    }
  },
});
