# Bright MLS — Back Office data feed request

Status: **drafted, not sent.** Five facts are needed before it goes out (see
"Before sending"). This is the licence path that unblocks `mcp/bright-mls/`.

## Why Back Office and not IDX/VOW

Bright's rules describe Back Office data as serving brokerage management, CRM
and productivity tools **that only expose data to the participant and
subscribers affiliated with that participant**. That fits internal underwriting.
It does not permit public display, which has a direct product consequence:

> **MLS data cannot feed the public landing page or a seller-facing comps
> display.** The net-sheet calculator stays on our own math and seller-supplied
> inputs. Comps from Bright are for internal underwriting only.

IDX/VOW are the display licences, and they are a separate, heavier application
we are not asking for.

## Who has to be involved

Bright requires the Broker of Record to be a subscriber, and broker
authorization is part of the feed application. **This application is visible to
the brokerage.** See "Sequencing risk" below.

## Contacts

| Address | For |
| --- | --- |
| `contentlicensing@brightmls.com` | Data feed / content licensing — the primary ask |
| `data-support@brightmls.com` | Developer tooling and API questions (cc) |

Both came from secondary sources; brightmls.com renders its contact pages with
JavaScript, so neither was confirmed on a primary page. If either bounces, the
published customer line is 1-844-552-7444 — ask for Content Licensing.

## Sequencing risk — read before sending

CLAUDE.md §5 lists the SERHANT ICA review and the PA licensee disclosure as
compliance gates that are **not yet cleared**. This application routes through
the Broker of Record, so sending it is likely how the brokerage first learns
about the acquisition venture.

If the ICA question is unresolved, settle it first. Bright is not the risk here;
the order of conversations is.

## A deliberate choice in the draft

The draft states plainly that the applicant is a licensed salesperson who also
buys for his own account. Misstating intended use on an MLS data licence is a
licence problem, and an investor use case discovered later is worse than one
disclosed up front. Soften it if you disagree, but do not remove it.

## Before sending — fill these five

1. PA real estate license number
2. Bright MLS subscriber / agent ID
3. Brokerage legal name and Bright office ID
4. Broker of Record name and email
5. Phone number

Entity name (CLAUDE.md §4) is deliberately absent: this applies under the
individual subscription, so the undecided LLC name does not block it.

---

## The email

**To:** contentlicensing@brightmls.com
**Cc:** data-support@brightmls.com
**Subject:** Back Office data feed / RESO Web API access request — Central PA (Cumberland, Dauphin, York)

---

Hello,

I am a licensed Pennsylvania real estate salesperson and a Bright MLS
subscriber, and I would like to begin the application process for a Back Office
(non-display) data feed via the Bright RESO Web API.

**Subscriber details**

- Name: Satish Brahmbhatt
- PA real estate license #: «FILL IN»
- Bright MLS subscriber / agent ID: «FILL IN»
- Brokerage firm and office: «FILL IN — legal name and Bright office ID»
- Broker of Record: «FILL IN — name and email; available to sign the broker authorization»
- Primary market: Cumberland, Dauphin and York counties, PA
- Email: satishbrahmbhatt92@gmail.com
- Phone: «FILL IN»

**Intended use**

Internal valuation and market analysis supporting my real estate business in
Central PA. Two uses, both internal:

1. Comparative market analysis and pricing work supporting listing
   presentations and seller consultations.
2. Underwriting properties I may acquire for my own account as a principal,
   including renovation resale.

On point 2, I want to be explicit up front: I am a licensed salesperson who also
purchases property for my own account, and I disclose my licensed status in those
transactions. I would rather state that plainly now than have it surface as a
question later, and I am happy to answer anything about it or to structure the
request differently if that use requires a different licence or feed type.

What I am not requesting: no public-facing display of listing data, no IDX or
VOW, no consumer-facing search, no syndication, and no redistribution to third
parties. I understand Back Office data may only be exposed to the participant
and to subscribers affiliated with that participant, and the tool is built for
exactly that scope.

**Technical summary**

- Access method: RESO Web API (OData v4), server-to-server, OAuth2
  client_credentials.
- Operations: read-only. The integration issues GET requests only.
- Resources needed: Property primarily; Member and Office if required for
  attribution.
- Hosting: private server environment, not publicly accessible; credentials held
  in a secrets manager and not committed to source control.
- The client is already built against your published RESO endpoints and is ready
  to point at test credentials.

**What I am asking for**

1. The correct application form(s) for a Back Office / non-display feed for an
   individual subscriber.
2. The Bright content licence agreement to review and sign, and confirmation of
   whether my Broker of Record must sign or authorize as the participant.
3. The broker authorization form, if one is required for this feed type.
4. Any fees, and the current data retention and attribution requirements for
   this feed.
5. Test credentials once the initial contract is complete, then production
   credentials when authorized.

If a Back Office feed is not the right vehicle for the second use above, please
tell me which licence is, and I will apply for that instead.

If any of this should be routed to a different team or submitted through a portal
rather than by email, please point me there and I will follow that process.

Thank you,

Satish Brahmbhatt
Licensed PA Real Estate Salesperson
«FILL IN — brokerage name»
satishbrahmbhatt92@gmail.com
«FILL IN — phone»
