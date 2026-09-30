import assert from "node:assert/strict";
import { test } from "node:test";
import type { BrightClient, CollectionResult, ODataRow } from "../src/client.js";
import { loadConfig } from "../src/config.js";
import type { ODataQuery } from "../src/odata.js";
import { TOOLS, toInputSchema } from "../src/server.js";
import { compsTool } from "../src/tools/comps.js";
import { getListingTool, searchListingsTool } from "../src/tools/listings.js";
import { marketSnapshotTool } from "../src/tools/market.js";
import type { ToolContext } from "../src/tools/types.js";

const cfg = loadConfig({
  BRIGHT_MLS_CLIENT_ID: "test-client",
  BRIGHT_MLS_CLIENT_SECRET: "test-secret",
  BRIGHT_MLS_ENV: "test",
} as NodeJS.ProcessEnv);

interface Recorded {
  resource: string;
  query: ODataQuery;
}

function stubContext(
  responses: ODataRow[][] | ODataRow[] = [],
  totalCount?: number,
): { ctx: ToolContext; calls: Recorded[] } {
  const queued: ODataRow[][] = Array.isArray(responses[0]) || responses.length === 0
    ? (responses as ODataRow[][])
    : [responses as ODataRow[]];
  const calls: Recorded[] = [];
  let index = 0;

  const client = {
    serviceRoot: cfg.serviceRoot,
    async getCollection(resource: string, query: ODataQuery): Promise<CollectionResult<ODataRow>> {
      calls.push({ resource, query });
      const rows = queued[index] ?? queued[queued.length - 1] ?? [];
      index += 1;
      return { rows, totalCount, pagesFetched: 1, truncated: false, requestUrl: "https://example.test/Property" };
    },
    async getEntityByKey(resource: string, key: string): Promise<ODataRow | undefined> {
      calls.push({ resource, query: { filter: `key:${key}` } });
      return queued[0]?.[0];
    },
  } as unknown as BrightClient;

  return { ctx: { cfg, client }, calls };
}

function parse<T extends { schema: { parse: (v: unknown) => unknown } }>(tool: T, args: Record<string, unknown>) {
  return tool.schema.parse(args) as never;
}

test("every tool exposes a usable JSON Schema", () => {
  assert.ok(TOOLS.length >= 7);
  for (const tool of TOOLS) {
    const schema = toInputSchema(tool);
    assert.equal(schema.type, "object", `${tool.name} must be an object schema`);
    assert.ok(tool.description.length > 40, `${tool.name} needs a real description`);
    assert.match(tool.name, /^bright_[a-z_]+$/);
  }
  assert.equal(new Set(TOOLS.map((t) => t.name)).size, TOOLS.length, "tool names must be unique");
});

test("search defaults to active listings in PA and applies the named filters", async () => {
  const { ctx, calls } = stubContext([[{ ListingKey: "1" }]]);
  const result = (await searchListingsTool.handler(
    parse(searchListingsTool, { city: "Camp Hill", min_price: 150000, max_price: 350000, min_beds: 3, limit: 5 }),
    ctx,
  )) as { returned: number; filter: string };

  assert.equal(calls.length, 1);
  assert.equal(calls[0]?.resource, "Property");
  assert.equal(calls[0]?.query.top, 5);
  assert.equal(
    result.filter,
    "StateOrProvince eq 'PA' and City eq 'Camp Hill' and StandardStatus eq 'Active' and " +
      "ListPrice ge 150000 and ListPrice le 350000 and BedroomsTotal ge 3",
  );
  assert.equal(result.returned, 1);
});

test("search handles the expired/withdrawn lead pull across counties", async () => {
  const { ctx } = stubContext([[]]);
  const result = (await searchListingsTool.handler(
    parse(searchListingsTool, {
      counties: ["Cumberland", "Dauphin", "York"],
      status: ["Expired", "Canceled", "Withdrawn"],
      order_by: "ListingContractDate",
    }),
    ctx,
  )) as { filter: string };

  assert.match(result.filter, /\(CountyOrParish eq 'Cumberland' or CountyOrParish eq 'Dauphin' or CountyOrParish eq 'York'\)/);
  assert.match(result.filter, /\(StandardStatus eq 'Expired' or StandardStatus eq 'Canceled' or StandardStatus eq 'Withdrawn'\)/);
});

test("search appends a raw filter with and, and passes through modified_since", async () => {
  const { ctx } = stubContext([[]]);
  const result = (await searchListingsTool.handler(
    parse(searchListingsTool, {
      postal_codes: ["17104"],
      modified_since: "2026-09-01T00:00:00Z",
      filter: "contains(PublicRemarks,'as-is')",
    }),
    ctx,
  )) as { filter: string };

  assert.match(result.filter, /ModificationTimestamp ge 2026-09-01T00:00:00Z/);
  assert.ok(result.filter.endsWith("and contains(PublicRemarks,'as-is')"));
});

test("search rejects a city with an unescaped quote only by escaping it", async () => {
  const { ctx } = stubContext([[]]);
  const result = (await searchListingsTool.handler(parse(searchListingsTool, { city: "O'Fallon" }), ctx)) as {
    filter: string;
  };
  assert.match(result.filter, /City eq 'O''Fallon'/);
});

test("get_listing needs one of the two identifiers", async () => {
  const { ctx } = stubContext();
  await assert.rejects(() => getListingTool.handler(parse(getListingTool, {}), ctx), /listing_key or listing_id/);
});

test("get_listing by MLS number filters on ListingId", async () => {
  const { ctx, calls } = stubContext([[{ ListingKey: "abc", ListingId: "PACB1234567" }]]);
  const result = (await getListingTool.handler(parse(getListingTool, { listing_id: "PACB1234567" }), ctx)) as {
    found: boolean;
  };
  assert.equal(result.found, true);
  assert.equal(calls[0]?.query.filter, "ListingId eq 'PACB1234567'");
});

test('get_listing with fields ["*"] sends no $select', async () => {
  const { ctx, calls } = stubContext([[{ ListingKey: "abc" }]]);
  await getListingTool.handler(parse(getListingTool, { listing_id: "PACB1", fields: ["*"] }), ctx);
  assert.equal(calls[0]?.query.select, undefined);
});

test("comps insists on an area", async () => {
  const { ctx } = stubContext();
  await assert.rejects(
    () => compsTool.handler(parse(compsTool, { subject_living_area: 1400 }), ctx),
    /postal_codes \(best\), city, or counties/,
  );
});

test("comps builds a closed-sales window and underwrites at 70%", async () => {
  const rows: ODataRow[] = [
    { ClosePrice: 200000, LivingArea: 1000, CloseDate: "2026-08-01" },
    { ClosePrice: 220000, LivingArea: 1100, CloseDate: "2026-07-15" },
    { ClosePrice: 180000, LivingArea: 900, CloseDate: "2026-06-20" },
    { ClosePrice: 240000, LivingArea: 1200, CloseDate: "2026-06-01" },
    { ClosePrice: 260000, LivingArea: 1300, CloseDate: "2026-05-11" },
  ];
  const { ctx, calls } = stubContext([rows]);

  const result = (await compsTool.handler(
    parse(compsTool, { postal_codes: ["17011"], subject_living_area: 1200, rehab_cost: 45000 }),
    ctx,
  )) as {
    filter: string;
    window: { living_area: [number, number] };
    arv_estimate: { arv: number };
    underwriting: { max_allowable_offer: number; mao_percent: number };
    comps: { PricePerSqFt: number | null }[];
  };

  assert.match(calls[0]?.query.orderby ?? "", /CloseDate desc/);
  assert.match(result.filter, /StandardStatus eq 'Closed'/);
  assert.match(result.filter, /CloseDate ge \d{4}-\d{2}-\d{2} and CloseDate le \d{4}-\d{2}-\d{2}/);
  // Default ±20% window around 1200 sqft.
  assert.deepEqual(result.window.living_area, [960, 1440]);
  assert.equal(result.arv_estimate.arv, 240000);
  assert.equal(result.underwriting.mao_percent, 0.7);
  assert.equal(result.underwriting.max_allowable_offer, 0.7 * 240000 - 45000);
  assert.equal(result.comps[0]?.PricePerSqFt, 200);
});

test("comps reports no MAO when ARV cannot be estimated", async () => {
  const { ctx } = stubContext([[{ ClosePrice: 200000 }]]);
  const result = (await compsTool.handler(parse(compsTool, { city: "York", subject_living_area: 1200 }), ctx)) as {
    underwriting: { note?: string; max_allowable_offer?: number };
  };
  assert.equal(result.underwriting.max_allowable_offer, undefined);
  assert.match(result.underwriting.note ?? "", /ARV could not be estimated/);
});

test("comps widens on beds and year built when the subject supplies them", async () => {
  const { ctx } = stubContext([[]]);
  const result = (await compsTool.handler(
    parse(compsTool, { postal_codes: ["17104"], subject_beds: 3, subject_year_built: 1950, year_built_tolerance: 15 }),
    ctx,
  )) as { filter: string };
  assert.match(result.filter, /BedroomsTotal ge 2 and BedroomsTotal le 4/);
  assert.match(result.filter, /YearBuilt ge 1935 and YearBuilt le 1965/);
});

test("market snapshot derives months of supply from both sides", async () => {
  const active: ODataRow[] = Array.from({ length: 10 }, (_, i) => ({ ListPrice: 200000 + i * 1000, LivingArea: 1000 }));
  const closed: ODataRow[] = Array.from({ length: 12 }, () => ({
    ClosePrice: 200000,
    ListPrice: 205000,
    LivingArea: 1000,
    DaysOnMarket: 15,
  }));
  const { ctx, calls } = stubContext([active, closed], undefined);

  const result = (await marketSnapshotTool.handler(
    parse(marketSnapshotTool, { postal_codes: ["17011"], months: 12 }),
    ctx,
  )) as {
    active: { total: number; median_price_per_sqft: number };
    closed: { total: number; median_close_price: number; close_to_list_pct: number };
    absorption: { sales_per_month: number; months_of_supply: number; reading: string };
    filters: { active: string; closed: string };
  };

  assert.equal(calls.length, 2);
  assert.match(result.filters.active, /StandardStatus eq 'Active'/);
  assert.match(result.filters.closed, /StandardStatus eq 'Closed'/);
  assert.equal(result.active.total, 10);
  assert.equal(result.closed.total, 12);
  assert.equal(result.absorption.sales_per_month, 1);
  assert.equal(result.absorption.months_of_supply, 10);
  assert.equal(result.absorption.reading, "buyer's market");
  // Active $/sqft comes off ListPrice, so it is reported rather than dropped.
  assert.ok(result.active.median_price_per_sqft > 0);
  assert.equal(result.closed.close_to_list_pct, 97.56);
});

test("market snapshot reports honestly when nothing closed", async () => {
  const { ctx } = stubContext([[{ ListPrice: 200000 }], []]);
  const result = (await marketSnapshotTool.handler(parse(marketSnapshotTool, { city: "Harrisburg" }), ctx)) as {
    absorption: { months_of_supply: null; reading: string };
  };
  assert.equal(result.absorption.months_of_supply, null);
  assert.equal(result.absorption.reading, "no closed sales in the window");
});
