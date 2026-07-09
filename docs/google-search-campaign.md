# Google Search campaign — draft v1

Market: Cumberland / Dauphin / York Counties, PA (West Shore + Harrisburg).
Positioning: **two offers side by side** + **no-retrade pledge**.
Landing page: `/` (form anchor `/#get-offers`); calculator ads → `/calculator`.

## Compliance guardrails (non-negotiable)

- Bidding on competitor brand keywords is legal. Using their trademarks in
  **ad copy** is not — never put a competitor name in a headline,
  description, path, or extension.
- Attack the category, never the company: "cash buyers typically pay
  50–70% of market value," "some buyers drop the price before closing."
- Every claim must be true of us: no fees, as-is, close in as little as
  14 days, written offer within 24 hours of walkthrough.
- Housing ads: enable Google's housing-category designation as required;
  no discriminatory targeting (age/gender/zip exclusion games).

## Campaign structure

| Campaign | Intent | Budget priority |
|---|---|---|
| 1. Sell Fast — Core | "sell my house fast harrisburg" | Highest |
| 2. Cash Buyer — Core | "cash for houses york pa" | High |
| 3. Situations | foreclosure / inherited / probate / tenants | Medium |
| 4. Competitor brand | brand terms of local cash buyers | Low bid, always-on |
| 5. Compare / calculator | "cash offer vs listing", "home sale net calculator" | Low, high-converting |

Geo: 25-mile radius around Harrisburg + Camp Hill + Mechanicsburg + York;
exclude out-of-state. Schedule: always-on; phone assets 8am–8pm.

## Ad group → keyword seeds (phrase/exact only; no broad in v1)

**1. Sell Fast — Core**
- "sell my house fast harrisburg pa"
- "sell my house fast york pa"
- "sell house quickly camp hill" / mechanicsburg / carlisle / hershey
- "need to sell my house fast"

**2. Cash Buyer — Core**
- "cash home buyers harrisburg"
- "we buy houses harrisburg pa" / york pa / cumberland county
- "companies that buy houses for cash near me"
- "sell house as is for cash pa"

**3. Situations** (one ad group each)
- foreclosure: "stop foreclosure harrisburg", "sell house before foreclosure pa"
- inherited/probate: "sell inherited house pa", "selling a house in probate pennsylvania"
- landlord: "sell rental property with tenants pa"
- divorce: "selling house during divorce pa"
- condition: "sell fire damaged house", "sell house that needs repairs"

**4. Competitor brand** — [names withheld from repo; keep the keyword list
in the ads account only]. Ad copy stays 100% generic (see guardrails).

**5. Compare / calculator**
- "cash offer vs listing my house"
- "how much do cash home buyers pay"
- "home sale net proceeds calculator"

Negative keywords (account-level): rent, apartment, zillow login, jobs,
salary, agent license, "how to become", wholesale course, free house.

## Responsive Search Ad copy blocks

Headlines (≤30 chars):
1. Two Real Offers. You Pick.
2. Cash Offer + Listing Option
3. Sell Your PA House As-Is
4. No Fees. No Commissions.
5. Close In As Little As 14 Days
6. The Offer We Make, We Close At
7. No Last-Minute Price Drops
8. Written Offer In 24 Hours
9. Harrisburg & York Home Buyers
10. See Both Numbers First
11. Licensed PA REALTORS®
12. Skip Repairs & Showings

Descriptions (≤90 chars):
1. Get a cash offer AND a listing net sheet side by side. Pick what nets you more. No fees.
2. Most cash buyers pay 50–70% of value. See both of your numbers in writing before you decide.
3. The offer we make is the offer we close at — no price drops before closing. Ever.
4. As-is, any condition. Foreclosure, inherited, tenants — one walkthrough, two real offers.

Paths: `/two-offers` `/no-fees`. Assets: sitelinks (How it works, Net-sheet
calculator, FAQ, Get my offers), call asset (tracked number — pending,
`lib/brand.ts`), location asset once LLC + GBP exist.

## Measurement

- Conversions: lead form submit (primary), calculator engagement + 60s
  (secondary), calls ≥60s from call asset.
- UTM: the lead API already stores a `utm` JSON blob — tag every final URL
  `?utm_source=google&utm_medium=cpc&utm_campaign={campaign}&utm_term={keyword}`
  (v1.1: read UTMs client-side in `LeadForm` and pass through).
- Weekly: search-terms report → harvest negatives; check competitor
  auction insights. CLAUDE.md §9: if competitor search presence is thin,
  raise budget on campaigns 1–2 and take the flank uncontested.
