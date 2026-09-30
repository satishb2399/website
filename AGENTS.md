# Engineering notes

## This is NOT the Next.js you know

This project uses Next.js 16 — breaking changes vs. older training data.
Read the relevant guide in `node_modules/next/dist/docs/` before writing any
code. Heed deprecation notices. Notably: Middleware is now `proxy.ts`
(project root), not `middleware.ts`.

## Stack (mirrors transactions-sbrealty conventions)

- Next.js 16 (App Router, React 19), TypeScript strict
- Tailwind 4 (CSS-first tokens in `app/globals.css`, `@theme inline`)
- Supabase (`@supabase/ssr` — see `lib/supabase/`)
- Resend (seller follow-up email, optional in v1)
- Deploy: Vercel

## Commands

```bash
npm install          # if the supabase CLI postinstall fails, add --ignore-scripts
npm run dev
npm run build
npm run lint
```

## Project shape

- `app/page.tsx` — landing page (dual-offer: cash offer + listing net sheet)
- `app/calculator/` — net-proceeds calculator (cash vs. list, side by side)
- `app/api/leads/` — lead intake → Supabase
- `lib/brand.ts` — ALL brand naming/contact in one place (entity name is
  still an open decision — see CLAUDE.md §4; swap it here)
- `lib/underwriting.ts` — 70% rule + net-sheet math (pure functions)
- `supabase/migrations/` — leads schema (dual-tag: cash-track vs list-track)
- `docs/` — marketing/campaign drafts
- `mcp/bright-mls/` — read-only MCP server for the Bright MLS RESO Web API
  (comps, ARV, 70% rule, market stats). Standalone Node package with its own
  `package.json`/`tsconfig` — excluded from the root tsconfig and eslint run.
  Needs Bright API credentials and a signed data licence; see its README.

## Compliance guardrails baked into copy (do not remove)

- PA licensee disclosure: Satish is a licensed PA real estate salesperson
  buying for his own account — disclosed in the footer and lead form.
- Competitor attacks stay at CATEGORY level ("cash buyers typically pay
  50–70% of market value") — never name competitors in ad copy or on-site.
- Core promise: "The offer we make is the offer we close at." Do not
  publish copy that undercuts or contradicts it.
