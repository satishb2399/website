/**
 * Read-only HTTP client for Bright's RESO Web API.
 *
 * Only ever issues GET. Retries 429/5xx with backoff (honouring Retry-After) and
 * re-authenticates once on 401. Collection reads follow @odata.nextLink up to a
 * configured page ceiling and report when they stopped early, so a caller never
 * mistakes a truncated page set for the whole result.
 */

import { TokenProvider, describeCause } from "./auth.js";
import type { BrightConfig } from "./config.js";
import { toSearchParams, type ODataQuery } from "./odata.js";

const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);
const MAX_ATTEMPTS = 3;

export class BrightApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly url?: string,
  ) {
    super(message);
    this.name = "BrightApiError";
  }
}

export interface CollectionResult<T> {
  rows: T[];
  /** Server-side total from $count, when requested. */
  totalCount?: number;
  pagesFetched: number;
  /** True when more pages existed but the page ceiling stopped us. */
  truncated: boolean;
  /** First request URL, for debugging (no credentials in it). */
  requestUrl: string;
}

export type ODataRow = Record<string, unknown>;

interface ODataPage<T> {
  value?: T[];
  "@odata.count"?: number;
  "@odata.nextLink"?: string;
}

export class BrightClient {
  private readonly tokens: TokenProvider;

  constructor(private readonly cfg: BrightConfig) {
    this.tokens = new TokenProvider(cfg);
  }

  get serviceRoot(): string {
    return this.cfg.serviceRoot;
  }

  /** Builds `{serviceRoot}/{resource}?{...}`, rejecting anything but a bare resource name. */
  resourceUrl(resource: string, query?: ODataQuery): string {
    assertResourceName(resource);
    const base = `${this.cfg.serviceRoot}/${resource}`;
    return query ? appendQuery(base, toSearchParams(query)) : base;
  }

  /** One page. Returns the parsed body as-is. */
  async getJson<T = ODataRow>(url: string): Promise<T> {
    const res = await this.request(url);
    const text = await res.text();
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new BrightApiError(`Bright returned a non-JSON body (${res.status}): ${text.slice(0, 300)}`, res.status, url);
    }
  }

  /** A collection read, following @odata.nextLink up to `maxPages`. */
  async getCollection<T extends ODataRow = ODataRow>(
    resource: string,
    query: ODataQuery,
    opts: { maxPages?: number } = {},
  ): Promise<CollectionResult<T>> {
    const maxPages = Math.max(1, Math.min(opts.maxPages ?? this.cfg.maxPages, 100));
    const firstUrl = this.resourceUrl(resource, { top: this.cfg.pageSize, ...query });

    const rows: T[] = [];
    let totalCount: number | undefined;
    let nextUrl: string | undefined = firstUrl;
    let pagesFetched = 0;

    while (nextUrl && pagesFetched < maxPages) {
      const body: ODataPage<T> = await this.getJson<ODataPage<T>>(nextUrl);
      pagesFetched += 1;
      if (Array.isArray(body.value)) rows.push(...body.value);
      if (typeof body["@odata.count"] === "number") totalCount ??= body["@odata.count"];
      nextUrl = body["@odata.nextLink"];
      // A caller-supplied $top is a hard row limit, not just a page size.
      if (query.top !== undefined && rows.length >= query.top) {
        rows.length = Math.min(rows.length, query.top);
        return { rows, totalCount, pagesFetched, truncated: Boolean(nextUrl), requestUrl: firstUrl };
      }
    }

    return { rows, totalCount, pagesFetched, truncated: Boolean(nextUrl), requestUrl: firstUrl };
  }

  /** Single entity by key: `{resource}('{key}')`. */
  async getEntityByKey<T extends ODataRow = ODataRow>(
    resource: string,
    key: string,
    select?: readonly string[],
  ): Promise<T | undefined> {
    assertResourceName(resource);
    const encodedKey = encodeURIComponent(key).replace(/'/g, "%27");
    const base = `${this.cfg.serviceRoot}/${resource}('${encodedKey}')`;
    const url = select?.length ? appendQuery(base, new URLSearchParams({ $select: select.join(",") })) : base;
    try {
      return await this.getJson<T>(url);
    } catch (err) {
      if (err instanceof BrightApiError && err.status === 404) return undefined;
      throw err;
    }
  }

  /** Raw EDMX $metadata document. */
  async getMetadataXml(): Promise<string> {
    const res = await this.request(`${this.cfg.serviceRoot}/$metadata`, "application/xml");
    return res.text();
  }

  private async request(url: string, accept = "application/json"): Promise<Response> {
    let lastError: BrightApiError | undefined;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      const token = await this.tokens.getAccessToken();
      if (this.cfg.debug) process.stderr.write(`[bright-mls] GET ${url}\n`);

      let res: Response;
      try {
        res = await fetch(url, {
          method: "GET",
          headers: { authorization: `Bearer ${token}`, accept },
          signal: AbortSignal.timeout(this.cfg.timeoutMs),
        });
      } catch (cause) {
        lastError = new BrightApiError(`Request to Bright failed: ${describeCause(cause)}`, undefined, url);
        if (attempt < MAX_ATTEMPTS) {
          await sleep(backoffMs(attempt));
          continue;
        }
        throw lastError;
      }

      if (res.ok) return res;

      // A 401 after a successful token fetch usually means the token expired
      // mid-flight; drop it and let the next attempt re-authenticate.
      if (res.status === 401 && attempt < MAX_ATTEMPTS) {
        this.tokens.invalidate();
        continue;
      }

      const detail = await readError(res);
      lastError = new BrightApiError(`Bright API ${res.status}: ${detail}`, res.status, url);

      if (RETRYABLE_STATUS.has(res.status) && attempt < MAX_ATTEMPTS) {
        await sleep(retryAfterMs(res) ?? backoffMs(attempt));
        continue;
      }
      throw lastError;
    }

    throw lastError ?? new BrightApiError("Request to Bright failed.", undefined, url);
  }
}

function assertResourceName(resource: string): void {
  if (!/^[A-Za-z][A-Za-z0-9]*$/.test(resource)) {
    throw new BrightApiError(`Invalid resource name ${JSON.stringify(resource)}.`);
  }
}

/**
 * Serialises the query string by hand so the `$` in `$filter`/`$top` stays
 * literal. URL.searchParams would percent-encode it to `%24`, which not every
 * OData gateway decodes.
 */
function appendQuery(base: string, params: URLSearchParams): string {
  const pairs: string[] = [];
  for (const [key, value] of params) pairs.push(`${key}=${encodeURIComponent(value)}`);
  return pairs.length ? `${base}?${pairs.join("&")}` : base;
}

async function readError(res: Response): Promise<string> {
  const text = await res.text().catch(() => "");
  try {
    const body = JSON.parse(text) as { error?: { message?: string; code?: string } };
    if (body.error?.message) return `${body.error.code ? `${body.error.code}: ` : ""}${body.error.message}`;
  } catch {
    /* fall through to the raw body */
  }
  return text.slice(0, 400) || res.statusText;
}

function retryAfterMs(res: Response): number | undefined {
  const header = res.headers.get("retry-after");
  if (!header) return undefined;
  const seconds = Number.parseInt(header, 10);
  if (Number.isFinite(seconds)) return Math.min(seconds, 30) * 1000;
  const date = Date.parse(header);
  if (!Number.isNaN(date)) return Math.min(Math.max(date - Date.now(), 0), 30_000);
  return undefined;
}

function backoffMs(attempt: number): number {
  return Math.round(500 * 2 ** (attempt - 1) * (0.75 + Math.random() * 0.5));
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
