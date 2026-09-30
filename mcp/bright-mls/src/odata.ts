/**
 * OData v4 expression helpers.
 *
 * Every string that reaches a $filter goes through `literal()`, which doubles
 * single quotes — the one escaping rule OData defines for string literals. Field
 * names are validated against an allowlist pattern so a model-supplied "field"
 * can't smuggle an expression into the filter.
 */

export class ODataError extends Error {}

const FIELD_RE = /^[A-Za-z_][A-Za-z0-9_]*(\/[A-Za-z_][A-Za-z0-9_]*)*$/;

/** Validates a field (or navigation path like `Media/MediaKey`) and returns it. */
export function field(name: string): string {
  if (!FIELD_RE.test(name)) {
    throw new ODataError(
      `Invalid OData field name ${JSON.stringify(name)}. Expected letters, digits and underscores, optionally separated by "/".`,
    );
  }
  return name;
}

/** String literal, with OData's quote-doubling escape. */
export function literal(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

export function num(value: number): string {
  if (!Number.isFinite(value)) throw new ODataError(`Expected a finite number, got ${value}`);
  return String(value);
}

/** Edm.Date literal (unquoted, `YYYY-MM-DD`) — e.g. CloseDate, ListingContractDate. */
export function dateLiteral(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new ODataError(`Expected a date as YYYY-MM-DD, got ${JSON.stringify(value)}`);
  }
  return value;
}

/** Edm.DateTimeOffset literal — e.g. ModificationTimestamp. */
export function dateTimeLiteral(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new ODataError(`Expected an ISO 8601 timestamp, got ${JSON.stringify(value)}`);
  }
  return parsed.toISOString().replace(/\.\d{3}Z$/, "Z");
}

export function eq(name: string, value: string | number | boolean): string {
  const rhs = typeof value === "string" ? literal(value) : typeof value === "number" ? num(value) : String(value);
  return `${field(name)} eq ${rhs}`;
}

export function cmp(name: string, op: "gt" | "ge" | "lt" | "le", value: string): string {
  return `${field(name)} ${op} ${value}`;
}

export function numRange(name: string, min?: number, max?: number): string[] {
  const out: string[] = [];
  if (min !== undefined) out.push(cmp(name, "ge", num(min)));
  if (max !== undefined) out.push(cmp(name, "le", num(max)));
  return out;
}

export function dateRange(name: string, from?: string, to?: string): string[] {
  const out: string[] = [];
  if (from) out.push(cmp(name, "ge", dateLiteral(from)));
  if (to) out.push(cmp(name, "le", dateLiteral(to)));
  return out;
}

/** `Field eq 'a' or Field eq 'b'`, parenthesised when it has more than one arm. */
export function anyOf(name: string, values: readonly string[]): string | undefined {
  if (values.length === 0) return undefined;
  const clauses = values.map((v) => eq(name, v));
  return clauses.length === 1 ? clauses[0]! : `(${clauses.join(" or ")})`;
}

export function contains(name: string, value: string): string {
  return `contains(${field(name)},${literal(value)})`;
}

export function and(clauses: readonly (string | undefined)[]): string | undefined {
  const kept = clauses.filter((c): c is string => typeof c === "string" && c.trim().length > 0);
  if (kept.length === 0) return undefined;
  return kept.join(" and ");
}

/** `Field asc` / `Field desc`, validated. */
export function orderBy(name: string, direction: "asc" | "desc" = "asc"): string {
  return `${field(name)} ${direction}`;
}

export interface ODataQuery {
  filter?: string;
  select?: readonly string[];
  orderby?: string;
  top?: number;
  skip?: number;
  expand?: string;
  count?: boolean;
}

export function toSearchParams(query: ODataQuery): URLSearchParams {
  const params = new URLSearchParams();
  if (query.filter) params.set("$filter", query.filter);
  if (query.select?.length) params.set("$select", query.select.map(field).join(","));
  if (query.orderby) params.set("$orderby", query.orderby);
  if (query.top !== undefined) params.set("$top", num(query.top));
  if (query.skip !== undefined) params.set("$skip", num(query.skip));
  if (query.expand) params.set("$expand", query.expand);
  if (query.count) params.set("$count", "true");
  return params;
}
