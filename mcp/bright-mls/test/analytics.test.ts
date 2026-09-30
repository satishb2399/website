import assert from "node:assert/strict";
import { test } from "node:test";
import { compStats, estimateArv, maxAllowableOffer, median, numbers, pricePerSqFtValues } from "../src/analytics.js";

test("median handles odd, even and empty sets", () => {
  assert.equal(median([3, 1, 2]), 2);
  assert.equal(median([1, 2, 3, 4]), 2.5);
  assert.equal(median([]), undefined);
});

test("numbers skips nulls and coerces numeric strings", () => {
  const rows = [{ ClosePrice: 200000 }, { ClosePrice: null }, { ClosePrice: "225000" }, { ClosePrice: "n/a" }, {}];
  assert.deepEqual(numbers(rows, "ClosePrice"), [200000, 225000]);
});

test("price per sqft prefers ClosePrice and falls back to ListPrice", () => {
  const values = pricePerSqFtValues([
    { ClosePrice: 200000, ListPrice: 210000, LivingArea: 1000 },
    { ListPrice: 300000, LivingArea: 1500 },
    { ClosePrice: 250000, LivingArea: 0 },
    { ClosePrice: 250000 },
  ]);
  assert.deepEqual(values, [200, 200]);
});

test("compStats summarises a comp set", () => {
  const stats = compStats([
    { ClosePrice: 200000, ListPrice: 210000, LivingArea: 1000, DaysOnMarket: 10 },
    { ClosePrice: 240000, ListPrice: 250000, LivingArea: 1200, DaysOnMarket: 30 },
    { ClosePrice: 260000, ListPrice: 260000, LivingArea: 1300, DaysOnMarket: 20 },
  ]);
  assert.equal(stats.sampleSize, 3);
  assert.equal(stats.closePrice.median, 240000);
  assert.equal(stats.pricePerSqFt.median, 200);
  assert.equal(stats.daysOnMarket.median, 20);
  assert.equal(stats.closeToListPct, 96);
});

test("ARV multiplies the subject's area by median $/sqft", () => {
  const stats = compStats([
    { ClosePrice: 200000, LivingArea: 1000 },
    { ClosePrice: 220000, LivingArea: 1100 },
    { ClosePrice: 180000, LivingArea: 900 },
    { ClosePrice: 240000, LivingArea: 1200 },
    { ClosePrice: 260000, LivingArea: 1300 },
  ]);
  const arv = estimateArv(1150, stats);
  assert.equal(arv.pricePerSqFt, 200);
  assert.equal(arv.arv, 230000);
  assert.equal(arv.confidence, "moderate");
});

test("ARV reports insufficient data rather than inventing a number", () => {
  const noArea = estimateArv(1200, compStats([{ ClosePrice: 200000 }]));
  assert.equal(noArea.arv, undefined);
  assert.equal(noArea.confidence, "insufficient");

  const noSubject = estimateArv(undefined, compStats([{ ClosePrice: 200000, LivingArea: 1000 }]));
  assert.equal(noSubject.arv, undefined);
  assert.equal(noSubject.confidence, "insufficient");
  assert.match(noSubject.notes.join(" "), /subject_living_area/);
});

test("a thin comp set is flagged as low confidence", () => {
  const arv = estimateArv(1000, compStats([{ ClosePrice: 200000, LivingArea: 1000 }]));
  assert.equal(arv.confidence, "low");
  assert.match(arv.notes.join(" "), /Only 1 usable comp/);
});

test("a comp set far off the subject's size says so", () => {
  const stats = compStats([
    { ClosePrice: 200000, LivingArea: 1000 },
    { ClosePrice: 210000, LivingArea: 1050 },
  ]);
  assert.match(estimateArv(2000, stats).notes.join(" "), /more than 30%/);
});

test("70% rule: (0.7 × ARV) − rehab, floored at zero", () => {
  assert.equal(maxAllowableOffer(300000, 50000), 160000);
  assert.equal(maxAllowableOffer(300000, 0), 210000);
  assert.equal(maxAllowableOffer(200000, 200000), 0);
  assert.equal(maxAllowableOffer(300000, 50000, 0.75), 175000);
});
