# CLAUDE.md — SB Home Buyers (Cash-Offer + Fix & Flip Venture)

> Kickoff / context file for Claude Code. Paste this into the project root.
> Owner: Satish Brahmbhatt. Market: Cumberland / Dauphin / York Counties, Central PA (West Shore + Harrisburg).

---

## 1. WHAT WE'RE BUILDING

A **dual-exit real estate acquisition machine** + fix-and-flip / construction operation.

Every seller lead gets TWO offers side by side:
1. **Cash offer** (we buy → renovate → flip / wholetail / hold)
2. **Listing net sheet** (list through the existing SERHANT team → keep the commission)

The seller picks. We profit either way. This is the structural edge over pure cash-buyer competitors:
they can only monetize a lead one way. We are licensed REALTORS® — we monetize twice.

Deliverables to build in this project:
- [ ] Brand + entity identity (name TBD — see §4)
- [ ] Landing page: cash offer form + net-sheet comparison + "offer we make = offer we close at"
- [ ] Net-proceeds / ARV calculator (cash vs. list, side by side)
- [ ] Lead intake → CRM pipeline (dual-tag: cash-track vs list-track)
- [ ] Google Search campaign (keywords, headlines, descriptions)
- [ ] Meta/UGC creative pipeline (Higgsfield)
- [ ] Underwriting sheet (70% rule automation)

## 2. TECH STACK (match ZoneWise conventions)
- Next.js 15 + TypeScript + Tailwind
- Supabase (leads, deals, underwriting)
- Mapbox GL JS (property/parcel context — optional v2)
- Stripe (not needed v1)
- Claude API (lead qualification, offer copy) — model string per current docs
- Vercel Pro (hosting)
- Resend (seller follow-up email)

## 3. VERIFIED COMPETITOR INTEL (as of this chat — RE-VERIFY LIVE)

**Primary competitor: Eric Brewer**
- Consumer brand: "Eric Buys Your House"; legal entity: Integrity First Home Buyers LLC, York PA
- Owner: Eric C. Brewer. BBB A+ accredited. Google rating ~4.9.
- Claims: #1 buyer in York, Adams, Cumberland, Lancaster, Dauphin Counties; 2,500+ homes; ~19–25 yrs
- Offer: cash offer within 24 hrs of walkthrough; no fees/commissions; buy as-is; close 7–45 days
- Channels: TV commercials, billboards, heavy paid search/social (6+ tracked phone numbers across web properties)
- **Explicitly states on BBB: "We are not realtors. We are investors."** ← our wedge
- Pain-point targets: foreclosure, divorce, inherited/probate, behind on payments, vacant,
  relocation, upside-down mortgage, liens, bad tenants, fire-damaged

**Second, separate operator (do not confuse): Eric Gunnet — "Eric Buys Homes In York"** (York-only; already pitches cash-OR-list hybrid)

**THE WEDGE (verified):**
- Third-party reviewers flag cash-buyer offers at 50–70% of market value ("lowball")
- BBB complaint on record: seller agreed on price, then ~2 days before closing got a call
  saying they couldn't make money at that price and asked to lower it → **the retrade**
- Our counter-promise: **"The offer we make is the offer we close at. No last-minute price drops."**
- COMPLIANCE: bidding on competitor brand keywords is legal; using their trademark in ad COPY is not.
  Attack price/retrades at CATEGORY level ("cash buyers typically pay 50–70%"), never name them negatively.

## 4. ENTITY / BRAND — DECISION NEEDED
Two directions on the table:
- **"SB Home Buyers"** — clean, brandable, separates from the brokerage
- **"Satish Buys Houses"** — first-name branding (proven in this market — Brewer/Gunnet both use it)
→ Pick one before building the brand kit + landing page.

## 5. COMPLIANCE GATES (clear BEFORE first offer — non-negotiable)
- [ ] SERHANT ICA: confirm no restriction on principal/self-account investing
- [ ] PA licensee disclosure: PA requires disclosing licensed-agent status when buying for own account
- [ ] New LLC formed, separate from brokerage; separate bank/books
- [ ] Assignment/novation contract language reviewed (Caldwell & Kearns)

## 6. CAPITAL / UNDERWRITING
- Line up 2–3 hard money lenders (Central PA) + private money (partner network)
- Rule: **Max Offer = (70% × ARV) − Rehab Cost**
- Satish has proven underwriting muscle (Allison Hill 34-unit portfolio, $55–65K/door buy zone)

## 7. CONSTRUCTION
- Do NOT build a crew for flip #1. Lock 2 GC relationships, fixed-scope pricing, run first 3 flips through them.
- Bring construction in-house only once volume is consistent (that's the margin jump).

## 8. LEAD ENGINE
Paid (model Brewer's funnel): Google Search on high-intent keywords + Meta with Higgsfield UGC.
Owned (our unfair edge — free pipeline Brewer pays TV money for):
- Non-converting Zillow Flex leads
- Expireds / FSBOs the team already touches
- Probate, code-violation, absentee-owner lists in 17104 / 17103 / West Shore

## 9. OUTSTANDING DATA PULL
Live competitor ad creatives NOT yet captured (Transparency Center + Meta Ad Library block automated access).
TODO: capture via Claude-in-Chrome on desktop OR manual phone screenshots, then feed creatives in as
teardown fuel + our own creative benchmark. If Google shows nothing → his search flank is open; take it uncontested.

## 10. IMMEDIATE NEXT ACTIONS
1. Pick entity name (§4)
2. Clear compliance gates (§5)
3. Build landing page + net-sheet calculator
4. Draft Google Search campaign
5. Capture competitor ad creatives (§9)
