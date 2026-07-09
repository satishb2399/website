# SB Home Buyers — dual-exit seller site

Consumer-facing site for the cash-offer + fix & flip venture (Central PA:
Cumberland / Dauphin / York Counties). Every seller gets **two offers side by
side**: a cash offer and a listing net sheet. Core promise: **the offer we
make is the offer we close at** — no last-minute price drops.

Kickoff context: `CLAUDE.md`. Engineering notes: `AGENTS.md`.

## Stack

- Next.js 16 (App Router, React 19) — the kickoff doc says 15, but this
  matches the current `transactions-sbrealty` conventions (Next 16 / Tailwind 4)
- TypeScript strict, Tailwind 4
- Supabase (leads), Resend (follow-up email, optional v1)
- Vercel (hosting)

## What's here (v1)

| Piece | Where |
|---|---|
| Landing page (dual-offer, lead form, FAQ) | `app/page.tsx` |
| Net-proceeds calculator (cash vs. list) | `app/calculator/` |
| Underwriting math (70% rule, net sheets) | `lib/underwriting.ts` |
| Brand config (name still swappable — CLAUDE.md §4) | `lib/brand.ts` |
| Lead intake API | `app/api/leads/route.ts` |
| Leads schema (dual-track tagging) | `supabase/migrations/` |
| Google Search campaign draft | `docs/google-search-campaign.md` |

## Local setup

```bash
npm install
cp .env.example .env.local   # fill in Supabase keys
npm run dev
```

The site renders without Supabase credentials; lead form submissions will
fail until `NEXT_PUBLIC_SUPABASE_URL` / keys are set and the migration in
`supabase/migrations/` is applied.
