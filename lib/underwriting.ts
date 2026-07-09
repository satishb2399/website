/**
 * Underwriting + net-sheet math. Pure functions — no I/O — so the same
 * numbers drive the public calculator, the lead API's auto-underwrite,
 * and any future internal underwriting sheet.
 *
 * Core rule (CLAUDE.md §6): Max Offer = (70% × ARV) − Rehab Cost
 */

// ---------------------------------------------------------------------------
// Assumption defaults — conservative, Central PA. Every number is overridable
// per-deal; these are the calculator's starting values.
// ---------------------------------------------------------------------------
export const DEFAULTS = {
  /** 70% rule multiplier */
  maoPercent: 0.7,
  /** Total listing commission (both sides) as fraction of sale price */
  listCommissionPct: 0.06,
  /** Seller-side closing costs when listing (deed transfer tax share, etc.) */
  listClosingPct: 0.02,
  /** PA deed transfer tax is 2% total, customarily split — included above */
  /** Typical seller concessions to buyer on a retail sale */
  listConcessionsPct: 0.01,
  /** Months of holding a seller carries while listed (mortgage, taxes, utils) */
  listMonthsCarry: 3,
  /** Cash sale: we pay all standard closing costs — seller pays none */
  cashSellerClosingPct: 0,
} as const;

export interface CashOfferInputs {
  /** After-repair value — what the home sells for fixed up */
  arv: number;
  /** Estimated renovation cost to reach ARV */
  rehabCost: number;
  /** MAO multiplier, default 0.70 */
  maoPercent?: number;
}

/** Max Allowable Offer under the 70% rule. Never negative. */
export function maxAllowableOffer({
  arv,
  rehabCost,
  maoPercent = DEFAULTS.maoPercent,
}: CashOfferInputs): number {
  return Math.max(0, arv * maoPercent - rehabCost);
}

export interface NetSheetInputs {
  /** Realistic as-is retail price if listed today (NOT the ARV) */
  asIsPrice: number;
  /** Remaining mortgage / liens to pay off at closing */
  mortgagePayoff?: number;
  /** Monthly carrying cost while listed (PITI + utilities) */
  monthlyCarry?: number;
  /** Cash offer amount to compare against */
  cashOffer: number;

  listCommissionPct?: number;
  listClosingPct?: number;
  listConcessionsPct?: number;
  listMonthsCarry?: number;
}

export interface NetSheetLine {
  label: string;
  amount: number;
}

export interface NetSheetSide {
  gross: number;
  deductions: NetSheetLine[];
  /** Net proceeds before mortgage payoff */
  netBeforePayoff: number;
  /** Cash to seller at closing after payoff */
  walkAway: number;
}

export interface NetSheetComparison {
  cash: NetSheetSide;
  list: NetSheetSide;
  /** list walk-away minus cash walk-away; positive = listing nets more */
  listAdvantage: number;
}

/**
 * Side-by-side seller net sheet: our cash offer vs. listing on the open
 * market. This is the "two offers" artifact — the honest math both tracks
 * are sold with.
 */
export function netSheetComparison(inputs: NetSheetInputs): NetSheetComparison {
  const {
    asIsPrice,
    mortgagePayoff = 0,
    monthlyCarry = 0,
    cashOffer,
    listCommissionPct = DEFAULTS.listCommissionPct,
    listClosingPct = DEFAULTS.listClosingPct,
    listConcessionsPct = DEFAULTS.listConcessionsPct,
    listMonthsCarry = DEFAULTS.listMonthsCarry,
  } = inputs;

  // --- Cash track: no commission, no seller closing costs, ~14-day close ---
  const cashDeductions: NetSheetLine[] = [
    { label: "Commissions", amount: 0 },
    { label: "Seller closing costs (we pay them)", amount: 0 },
    { label: "Repairs & clean-out", amount: 0 },
    { label: "Holding costs (fast close)", amount: 0 },
  ];
  const cashNet = cashOffer;

  // --- List track: full retail price, minus the real costs of getting it ---
  const commission = asIsPrice * listCommissionPct;
  const closing = asIsPrice * listClosingPct;
  const concessions = asIsPrice * listConcessionsPct;
  const carry = monthlyCarry * listMonthsCarry;
  const listDeductions: NetSheetLine[] = [
    { label: "Commissions", amount: commission },
    { label: "Transfer tax & closing costs", amount: closing },
    { label: "Buyer concessions / inspection credits", amount: concessions },
    {
      label: `Carrying costs (~${listMonthsCarry} mo. on market)`,
      amount: carry,
    },
  ];
  const listNet = asIsPrice - commission - closing - concessions - carry;

  const cash: NetSheetSide = {
    gross: cashOffer,
    deductions: cashDeductions,
    netBeforePayoff: cashNet,
    walkAway: cashNet - mortgagePayoff,
  };
  const list: NetSheetSide = {
    gross: asIsPrice,
    deductions: listDeductions,
    netBeforePayoff: listNet,
    walkAway: listNet - mortgagePayoff,
  };

  return { cash, list, listAdvantage: list.walkAway - cash.walkAway };
}

/** Format a dollar amount for display: $123,456 (negatives in parens). */
export function usd(n: number): string {
  const rounded = Math.round(Math.abs(n));
  const s = `$${rounded.toLocaleString("en-US")}`;
  return n < 0 ? `(${s})` : s;
}
