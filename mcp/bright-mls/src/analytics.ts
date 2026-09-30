/**
 * Statistics over comp sets, plus the 70% rule.
 *
 * Pure functions, no I/O. The MAO formula mirrors `lib/underwriting.ts` in the
 * web app (CLAUDE.md §6) — that file stays the canonical one for anything the
 * seller sees; this copy exists so the MCP server builds standalone. Keep the
 * multiplier in sync if the rule ever changes.
 */

export const MAO_PERCENT = 0.7;

export function median(values: readonly number[]): number | undefined {
  if (values.length === 0) return undefined;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1]! + sorted[mid]!) / 2 : sorted[mid]!;
}

export function mean(values: readonly number[]): number | undefined {
  if (values.length === 0) return undefined;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/** Finite numbers only — RESO fields are frequently null. */
export function numbers(rows: readonly Record<string, unknown>[], key: string): number[] {
  const out: number[] = [];
  for (const row of rows) {
    const value = row[key];
    if (typeof value === "number" && Number.isFinite(value)) out.push(value);
    else if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) out.push(Number(value));
  }
  return out;
}

export interface NumericSummary {
  count: number;
  median?: number;
  mean?: number;
  min?: number;
  max?: number;
}

export function summarize(values: readonly number[]): NumericSummary {
  return {
    count: values.length,
    median: round(median(values)),
    mean: round(mean(values)),
    min: values.length ? Math.min(...values) : undefined,
    max: values.length ? Math.max(...values) : undefined,
  };
}

export interface CompStats {
  sampleSize: number;
  closePrice: NumericSummary;
  listPrice: NumericSummary;
  livingArea: NumericSummary;
  pricePerSqFt: NumericSummary;
  daysOnMarket: NumericSummary;
  /** Median close price ÷ median list price, as a percentage. */
  closeToListPct?: number;
}

/**
 * Price per finished square foot, one entry per row that has both numbers.
 * Uses ClosePrice when the row has one (a sold comp) and falls back to ListPrice
 * (active inventory), so the same helper works either side of a market snapshot.
 */
export function pricePerSqFtValues(rows: readonly Record<string, unknown>[]): number[] {
  const out: number[] = [];
  for (const row of rows) {
    const close = Number(row.ClosePrice);
    const list = Number(row.ListPrice);
    const price = Number.isFinite(close) && close > 0 ? close : list;
    const area = Number(row.LivingArea);
    if (Number.isFinite(price) && price > 0 && Number.isFinite(area) && area > 0) {
      out.push(price / area);
    }
  }
  return out;
}

export function compStats(rows: readonly Record<string, unknown>[]): CompStats {
  const closePrices = numbers(rows, "ClosePrice");
  const listPrices = numbers(rows, "ListPrice");
  const areas = numbers(rows, "LivingArea");
  const dom = numbers(rows, "DaysOnMarket");

  const perSqFt = pricePerSqFtValues(rows);

  const medianClose = median(closePrices);
  const medianList = median(listPrices);

  return {
    sampleSize: rows.length,
    closePrice: summarize(closePrices),
    listPrice: summarize(listPrices),
    livingArea: summarize(areas),
    pricePerSqFt: { ...summarize(perSqFt), median: round2(median(perSqFt)), mean: round2(mean(perSqFt)) },
    daysOnMarket: summarize(dom),
    closeToListPct:
      medianClose !== undefined && medianList !== undefined && medianList > 0
        ? round2((medianClose / medianList) * 100)
        : undefined,
  };
}

export interface ArvEstimate {
  /** Undefined when the comp set has no usable price-per-sqft data. */
  arv?: number;
  method: string;
  pricePerSqFt?: number;
  sampleSize: number;
  confidence: "low" | "moderate" | "insufficient";
  notes: string[];
}

/**
 * ARV from the comp set's median $/sqft × the subject's living area. A blunt
 * instrument: it does not adjust for condition, lot, garage, or finished
 * basement. It is a starting number for an underwriter, not an appraisal.
 */
export function estimateArv(subjectLivingArea: number | undefined, stats: CompStats): ArvEstimate {
  const notes: string[] = [];
  const perSqFt = stats.pricePerSqFt.median;
  const usable = stats.pricePerSqFt.count;

  if (perSqFt === undefined || usable === 0) {
    return {
      method: "median $/sqft of closed comps",
      sampleSize: usable,
      confidence: "insufficient",
      notes: ["No closed comp in the set had both a ClosePrice and a LivingArea, so no $/sqft could be computed."],
    };
  }

  if (!subjectLivingArea || subjectLivingArea <= 0) {
    return {
      method: "median $/sqft of closed comps",
      pricePerSqFt: perSqFt,
      sampleSize: usable,
      confidence: "insufficient",
      notes: ["Subject living area is unknown — pass subject_living_area to get an ARV figure."],
    };
  }

  if (usable < 3) notes.push(`Only ${usable} usable comp(s) — treat the ARV as a placeholder until the set is wider.`);
  if (stats.livingArea.median && Math.abs(stats.livingArea.median - subjectLivingArea) / subjectLivingArea > 0.3) {
    notes.push("Comp median living area differs from the subject by more than 30% — tighten the living-area window.");
  }
  notes.push("No adjustment for condition, lot size, garage, or finished basement. Verify against the comp detail.");

  return {
    arv: round(perSqFt * subjectLivingArea),
    method: "median $/sqft of closed comps × subject living area",
    pricePerSqFt: perSqFt,
    sampleSize: usable,
    confidence: usable >= 5 ? "moderate" : "low",
    notes,
  };
}

/** Max Allowable Offer = (maoPercent × ARV) − rehab. Never negative. */
export function maxAllowableOffer(arv: number, rehabCost = 0, maoPercent = MAO_PERCENT): number {
  return Math.max(0, Math.round(arv * maoPercent - rehabCost));
}

function round(n: number | undefined): number | undefined {
  return n === undefined ? undefined : Math.round(n);
}

function round2(n: number | undefined): number | undefined {
  return n === undefined ? undefined : Math.round(n * 100) / 100;
}
