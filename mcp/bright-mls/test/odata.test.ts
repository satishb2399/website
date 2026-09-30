import assert from "node:assert/strict";
import { test } from "node:test";
import * as od from "../src/odata.js";

test("string literals double embedded single quotes", () => {
  assert.equal(od.literal("O'Brien"), "'O''Brien'");
  assert.equal(od.literal("Camp Hill"), "'Camp Hill'");
  // The classic injection attempt becomes an inert literal.
  assert.equal(od.literal("x' or ListPrice gt 0 or '"), "'x'' or ListPrice gt 0 or '''");
});

test("field names are validated, not interpolated blindly", () => {
  assert.equal(od.field("ListPrice"), "ListPrice");
  assert.equal(od.field("Media/MediaKey"), "Media/MediaKey");
  for (const bad of ["List Price", "ListPrice eq 1", "ListPrice;", "", "1Price", "Price'"]) {
    assert.throws(() => od.field(bad), od.ODataError, `expected ${JSON.stringify(bad)} to be rejected`);
  }
});

test("eq renders per type", () => {
  assert.equal(od.eq("City", "York"), "City eq 'York'");
  assert.equal(od.eq("ListPrice", 250000), "ListPrice eq 250000");
  assert.equal(od.eq("InternetEntireListingDisplayYN", true), "InternetEntireListingDisplayYN eq true");
});

test("anyOf parenthesises only when it has to", () => {
  assert.equal(od.anyOf("StandardStatus", ["Active"]), "StandardStatus eq 'Active'");
  assert.equal(
    od.anyOf("StandardStatus", ["Expired", "Canceled"]),
    "(StandardStatus eq 'Expired' or StandardStatus eq 'Canceled')",
  );
  assert.equal(od.anyOf("PostalCode", []), undefined);
});

test("numeric and date ranges emit only the bounds given", () => {
  assert.deepEqual(od.numRange("ListPrice", 100000, 300000), ["ListPrice ge 100000", "ListPrice le 300000"]);
  assert.deepEqual(od.numRange("ListPrice", undefined, 300000), ["ListPrice le 300000"]);
  assert.deepEqual(od.numRange("ListPrice", undefined, undefined), []);
  assert.deepEqual(od.dateRange("CloseDate", "2026-01-01"), ["CloseDate ge 2026-01-01"]);
});

test("date literals are unquoted and validated", () => {
  assert.equal(od.dateLiteral("2026-03-31"), "2026-03-31");
  assert.throws(() => od.dateLiteral("03/31/2026"), od.ODataError);
  assert.throws(() => od.dateLiteral("2026-03-31T00:00:00Z"), od.ODataError);
});

test("timestamp literals normalise to OData's second-precision UTC form", () => {
  assert.equal(od.dateTimeLiteral("2026-03-31T12:30:00.123Z"), "2026-03-31T12:30:00Z");
  assert.equal(od.dateTimeLiteral("2026-03-31"), "2026-03-31T00:00:00Z");
  assert.throws(() => od.dateTimeLiteral("not a date"), od.ODataError);
});

test("and drops empties and joins the rest", () => {
  assert.equal(od.and(["A eq 1", undefined, "", "B eq 2"]), "A eq 1 and B eq 2");
  assert.equal(od.and([undefined, undefined]), undefined);
});

test("toSearchParams maps to $-prefixed OData params", () => {
  const params = od.toSearchParams({
    filter: "City eq 'York'",
    select: ["ListingKey", "ListPrice"],
    orderby: "ListPrice desc",
    top: 10,
    count: true,
  });
  assert.equal(params.get("$filter"), "City eq 'York'");
  assert.equal(params.get("$select"), "ListingKey,ListPrice");
  assert.equal(params.get("$orderby"), "ListPrice desc");
  assert.equal(params.get("$top"), "10");
  assert.equal(params.get("$count"), "true");
  assert.equal(params.get("$skip"), null);
});

test("toSearchParams validates every selected field", () => {
  assert.throws(() => od.toSearchParams({ select: ["ListPrice", "bad field"] }), od.ODataError);
});
