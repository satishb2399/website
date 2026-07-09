/**
 * Brand config — the ONLY place the entity name lives.
 *
 * CLAUDE.md §4: the entity name is still an open decision between
 * "SB Home Buyers" and "Satish Buys Houses". Building with the working
 * name from the kickoff doc's title; to rebrand, change the values here
 * and everything (metadata, copy, footer, emails) follows.
 */
export const BRAND = {
  name: "SB Home Buyers",
  legalName: "SB Home Buyers LLC", // pending — LLC not yet formed (CLAUDE.md §5)
  domain: "sbhomebuyers.com", // placeholder until domain is purchased
  phone: "", // fill in tracked number before launch
  phoneDisplay: "", // e.g. "(717) 555-0142"
  email: "offers@sbrealty.co",

  market: "Cumberland, Dauphin & York Counties, PA",
  marketShort: "Central PA",
  serviceAreas: [
    "Harrisburg",
    "Camp Hill",
    "Mechanicsburg",
    "New Cumberland",
    "Lemoyne",
    "Enola",
    "Carlisle",
    "York",
    "Hershey",
    "Middletown",
    "Steelton",
  ],

  // The structural promise — the wedge vs. pure cash buyers (CLAUDE.md §3).
  pledge: "The offer we make is the offer we close at.",
  pledgeSub: "No last-minute price drops. No retrades. Ever.",

  // PA licensee disclosure — REQUIRED on every consumer touchpoint where we
  // solicit to buy for our own account (CLAUDE.md §5). Do not remove.
  licenseeDisclosure:
    "Satish Brahmbhatt is a licensed Pennsylvania real estate salesperson. " +
    "When we make a cash offer, we are offering to purchase your property " +
    "for our own account, as principals, for investment purposes — we are " +
    "not representing you as your agent in that purchase. You are free to " +
    "seek independent representation or advice, and you may also choose our " +
    "no-obligation listing option instead, in which case agency relationships " +
    "will be disclosed and agreed to in writing as required by Pennsylvania law.",
} as const;
