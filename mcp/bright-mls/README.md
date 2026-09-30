# Bright MLS MCP server

Read-only Model Context Protocol server for the [Bright MLS RESO Web API](https://developer.brightmls.com/)
(OData v4). Bright covers the Mid-Atlantic, including the Cumberland / Dauphin / York
county market this venture underwrites.

It exists so an agent can answer acquisition questions against live MLS data instead of
guesses: what's on the market, what actually closed, what the comps say a house is worth
fixed up, and what the 70% rule allows us to offer.

**GET only.** Nothing in this server writes to Bright.

## Before it can work

Bright's API is licensed, not open. You need:

1. An approved Bright MLS API application and a signed data licence.
2. A `client_id` / `client_secret` pair — Bright issues test credentials first, then
   production ones once you're authorised. Contact `data-support@brightmls.com`.

Test credentials do not authenticate against production, or the reverse.

Whatever you pull is covered by that licence. It governs what you may store, how long,
and what you may display or republish — check it before caching listing data into
Supabase or putting comps in front of a seller.

## Setup

```bash
cd mcp/bright-mls
npm install
npm run build
```

Credentials come from the environment — copy `.env.example` for the variable names and
export them from your shell or secret manager. Then confirm the whole path works:

```bash
BRIGHT_MLS_CLIENT_ID=… BRIGHT_MLS_CLIENT_SECRET=… npm run doctor
```

`doctor` checks configuration, gets a token, reads one row, pulls `$metadata`, and
**validates every field name this server sends by default against Bright's live
schema**. That last check matters: the field sets in `src/fields.ts` are standard RESO
Data Dictionary names, but every MLS publishes a subset, and Bright rejects a `$select`
naming an unknown field with a 400 rather than ignoring it. Run `doctor` once you have
credentials and fix anything it reports before trusting the tools.

### Wiring it into Claude Code

The repo's `.mcp.json` already registers this server and reads the credentials from your
shell environment, so once `npm run build` has been run and the variables are exported,
Claude Code picks it up on the next session. Verify with `/mcp`.

## Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `BRIGHT_MLS_CLIENT_ID` | — | **Required.** OAuth client id. |
| `BRIGHT_MLS_CLIENT_SECRET` | — | **Required.** OAuth client secret. |
| `BRIGHT_MLS_ENV` | `test` | `test` or `production`; selects both endpoints below. |
| `BRIGHT_MLS_BASE_URL` | per env | Service root override. |
| `BRIGHT_MLS_TOKEN_URL` | per env | Token endpoint override. |
| `BRIGHT_MLS_SCOPE` | unset | Sent only if set. |
| `BRIGHT_MLS_TOKEN_AUTH` | `basic` | `basic` or `post`; auto-falls back on `invalid_client`. |
| `BRIGHT_MLS_PAGE_SIZE` | `100` | Default `$top` per request. |
| `BRIGHT_MLS_MAX_PAGES` | `5` | Ceiling on `@odata.nextLink` pages per call. |
| `BRIGHT_MLS_TIMEOUT_MS` | `30000` | Per-request timeout. |
| `BRIGHT_MLS_DEBUG` | unset | `1` logs request URLs to stderr (never credentials). |

Endpoints, by environment:

| | Service root | Token endpoint |
| --- | --- | --- |
| test | `https://bright-reso.tst.brightmls.com/RESO/OData/bright` | `https://okta.tst.brightmls.com/oauth2/default/v1/token` |
| production | `https://bright-reso.brightmls.com/RESO/OData/bright` | `https://okta.brightmls.com/oauth2/default/v1/token` |

The default is `test`, deliberately — you have to opt in to hitting production.

## Tools

| Tool | What it does |
| --- | --- |
| `bright_search_listings` | Property search by area, status, price, size, age, days on market, modification timestamp. Covers active inventory, closed sales, and expired/withdrawn listing-lead pulls. |
| `bright_get_listing` | One listing by `ListingKey` or by MLS number (`ListingId`). |
| `bright_comps` | Closed comps around a subject → median $/sqft → ARV → 70% rule max offer. |
| `bright_market_snapshot` | Active vs. closed for an area: counts, medians, days on market, close-to-list, months of supply. |
| `bright_describe_resource` | Live `$metadata`: entity sets, real field names and types, and a field-existence check. |
| `bright_odata_query` | Raw OData read against any entity set, for anything the named tools don't cover. |
| `bright_check_connection` | Config + token + one-row read. Run first when something fails. |

### Area filtering

Bright's feed exposes no radius search, so area narrowing goes, tightest first:
`postal_codes` → `city` → `counties`. Every tool takes all three.

### `bright_comps` and the 70% rule

Give it an area and the subject's living area; it pulls closed sales inside a size,
bed, year and date window, then reports:

- comp statistics (median close price, $/sqft, days on market, close-to-list ratio)
- an ARV estimate: median $/sqft × the subject's living area
- `max_allowable_offer` = (0.70 × ARV) − rehab cost (CLAUDE.md §6)

**The ARV is a screening number, not an appraisal.** It uses unadjusted comps — no
correction for condition, lot, garage, or finished basement — and the tool says so in
its own output, including when the comp set is too thin or too far off the subject's
size to trust. Report it that way rather than as a valuation.

The MAO formula is duplicated from `lib/underwriting.ts` so this package builds
standalone. That file stays canonical for anything a seller sees; keep the multiplier in
sync if the house rule changes.

## How it behaves

- **Auth**: `client_credentials`, tokens cached and refreshed 60s before expiry,
  concurrent refreshes collapsed into one request. Handles both Okta's RFC 6749 and its
  native error shapes.
- **Retries**: 429 and 5xx retried up to 3 attempts with jittered backoff, honouring
  `Retry-After`. A 401 mid-flight drops the token and re-authenticates once.
- **Paging**: follows `@odata.nextLink` to the page ceiling and sets `truncated: true`
  when it stopped early, so a partial result is never mistaken for a complete one.
- **Injection**: every string reaching a `$filter` is quote-doubled, and every field
  name is validated against an allowlist pattern, so a model-supplied value can't
  smuggle an expression into a query.
- **Wire format**: `$` in `$filter` / `$top` is left literal rather than
  percent-encoded, which not every OData gateway decodes.
- **Output size**: a single result is capped at 250k characters with an explicit note,
  rather than silently flooding the context.

## Development

```bash
npm run typecheck
npm test        # 64 tests, no network — fetch is stubbed
npm run dev     # run from source over stdio
```

Tests cover the OData escaping rules, comp statistics and the 70% rule, `$metadata`
parsing, config validation and redaction, the OAuth flows (including the auth-method
fallback and both Okta error shapes), client paging and retry behaviour, and each tool's
generated filter.

## Troubleshooting

| Symptom | Cause |
| --- | --- |
| `invalid_client` | Wrong id/secret, or credentials from the other environment. Check `BRIGHT_MLS_ENV`. |
| `invalid_scope` | Bright expects a scope — set `BRIGHT_MLS_SCOPE`. |
| `403` | Authenticated, but your licence may not cover that resource. Ask `data-support@brightmls.com`. |
| `400` naming a property | The field isn't in Bright's model. Run `bright_describe_resource`, or `npm run doctor`, and pass real names via `fields`. |
| Empty results | Over-narrow filter. Loosen the tolerances, or confirm the status values with `bright_describe_resource`. |
