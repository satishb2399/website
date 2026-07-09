import Link from "next/link";
import { Header } from "@/components/marketing/Header";
import { Footer } from "@/components/marketing/Footer";
import { LeadForm } from "@/components/marketing/LeadForm";
import { BRAND } from "@/lib/brand";

export default function HomePage() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <Hero />
        <PledgeBar />
        <TwoOffers />
        <HowItWorks />
        <Situations />
        <WhyBoth />
        <Faq />
        <GetOffers />
      </main>
      <Footer />
    </>
  );
}

/* ------------------------------------------------------------------ */

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto grid max-w-6xl gap-12 px-4 pb-16 pt-14 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:pb-24 lg:pt-20">
        <div>
          <p className="eyebrow">
            Sell your house in {BRAND.marketShort} — your way
          </p>
          <h1 className="mt-4 text-4xl font-bold leading-[1.08] tracking-tight text-ink sm:text-5xl">
            One walkthrough.{" "}
            <span className="text-navy">
              Two real offers, side by side.
            </span>
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink-2">
            A fair <strong className="text-ink">cash offer</strong> if you
            want speed and certainty — or a{" "}
            <strong className="text-ink">listing net sheet</strong> if you
            want top dollar. Most &ldquo;we buy houses&rdquo; companies can
            only give you one of those. We&rsquo;re licensed REALTORS®, so you
            get both — and you pick.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="#get-offers"
              className="rounded-lg bg-navy px-6 py-3.5 text-center text-[15px] font-semibold text-ink-inverse shadow-card transition-colors hover:bg-navy-deep"
            >
              Get my two offers
            </Link>
            <Link
              href="/calculator"
              className="rounded-lg border border-line-strong bg-surface px-6 py-3.5 text-center text-[15px] font-semibold text-ink transition-colors hover:border-navy"
            >
              Try the net-sheet calculator
            </Link>
          </div>

          <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink-2">
            <li>✓ No fees or commissions on cash offers</li>
            <li>✓ Buy as-is — no repairs, no clean-out</li>
            <li>✓ Close on your timeline</li>
          </ul>
        </div>

        {/* Offer comparison card — the product, visualized */}
        <div className="rounded-2xl border border-line bg-surface p-6 shadow-pop">
          <p className="text-sm font-semibold text-ink-3">
            What you&rsquo;ll get after one walkthrough
          </p>
          <div className="mt-4 grid gap-3">
            <div className="rounded-xl border border-gold bg-gold-light/30 p-4">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-ink">Offer 1 — Cash</p>
                <span className="rounded-full bg-navy px-2.5 py-0.5 text-xs font-semibold text-ink-inverse">
                  Fast &amp; certain
                </span>
              </div>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-2">
                Written cash offer. As-is, no fees, close in as little as 14
                days — or whenever suits you.
              </p>
            </div>
            <div className="rounded-xl border border-line p-4">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-ink">Offer 2 — List it</p>
                <span className="rounded-full bg-surface-warm px-2.5 py-0.5 text-xs font-semibold text-ink-2">
                  Top dollar
                </span>
              </div>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-2">
                A real net sheet showing what listing on the open market puts
                in your pocket, after every cost — so the comparison is
                honest.
              </p>
            </div>
          </div>
          <p className="mt-4 border-t border-line pt-4 text-center text-sm font-medium text-ink">
            You pick. Either way, you know you chose with the full picture.
          </p>
        </div>
      </div>
    </section>
  );
}

function PledgeBar() {
  return (
    <section className="bg-surface-navy">
      <div className="mx-auto max-w-6xl px-4 py-10 text-center sm:px-6">
        <p className="text-2xl font-bold tracking-tight text-ink-inverse sm:text-3xl">
          &ldquo;{BRAND.pledge}&rdquo;
        </p>
        <p className="mx-auto mt-3 max-w-2xl text-[15px] leading-relaxed text-ink-inverse-2">
          Some cash buyers agree on a price, then call days before closing to
          lower it — after you&rsquo;ve already packed. We put our number in
          writing and we close at it. {BRAND.pledgeSub}
        </p>
      </div>
    </section>
  );
}

function TwoOffers() {
  const rows: Array<[string, string, string]> = [
    ["Speed", "Close in as little as 14 days", "Typically 60–120 days start to finish"],
    ["Certainty", "No financing, appraisal, or inspection contingencies", "Buyer financing can fall through"],
    ["Condition", "Exactly as-is — leave what you don't want", "Repairs, cleaning, showings"],
    ["Costs to you", "None — no commissions, we pay closing costs", "Commissions + closing costs + carrying costs"],
    ["Price", "Below full retail — that's the honest trade for speed", "Highest gross price the market will pay"],
  ];
  return (
    <section id="two-offers" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6 lg:py-24">
      <p className="eyebrow">Two offers, honestly compared</p>
      <h2 className="mt-3 max-w-2xl text-3xl font-bold tracking-tight text-ink sm:text-4xl">
        Cash isn&rsquo;t always the right answer. Neither is listing.
      </h2>
      <p className="mt-4 max-w-2xl text-[17px] leading-relaxed text-ink-2">
        Cash buyers in this market typically pay 50–70% of full market value —
        that&rsquo;s the price of speed and certainty, and it&rsquo;s the
        right trade for some situations. But nobody should take that deal
        without seeing the alternative in writing. We show you both numbers.
      </p>

      <div className="mt-10 overflow-x-auto">
        <table className="w-full min-w-[640px] border-separate border-spacing-0 text-[15px]">
          <thead>
            <tr>
              <th className="w-1/4 pb-3 text-left text-sm font-semibold text-ink-3" />
              <th className="rounded-t-xl border border-b-0 border-gold bg-gold-light/30 px-5 py-3 text-left font-semibold text-ink">
                Our cash offer
              </th>
              <th className="border border-b-0 border-l-0 border-line px-5 py-3 text-left font-semibold text-ink">
                Listing with our team
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([label, cash, list], i) => (
              <tr key={label}>
                <td className="border-b border-line py-3 pr-4 font-medium text-ink-2">
                  {label}
                </td>
                <td
                  className={`border border-t-0 border-gold bg-gold-light/30 px-5 py-3 text-ink-2 ${
                    i === rows.length - 1 ? "rounded-b-xl" : ""
                  }`}
                >
                  {cash}
                </td>
                <td className="border-b border-r border-line px-5 py-3 text-ink-2">
                  {list}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-6 text-sm text-ink-3">
        Want the actual math for your house?{" "}
        <Link
          href="/calculator"
          className="font-semibold text-navy underline underline-offset-2"
        >
          Run your numbers in the calculator →
        </Link>
      </p>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    {
      n: "1",
      title: "Tell us about the house",
      body: "Two minutes online or one phone call. Address, condition, timeline — that's it.",
    },
    {
      n: "2",
      title: "One quick walkthrough",
      body: "We visit once. Within 24 hours you get a written cash offer AND a listing net sheet, side by side.",
    },
    {
      n: "3",
      title: "You pick — and we close at our number",
      body: "Take the cash and close in as little as 14 days, list for top dollar, or walk away. No pressure, no fees, no price drops at the closing table.",
    },
  ];
  return (
    <section id="how-it-works" className="scroll-mt-20 bg-surface-warm">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
        <p className="eyebrow">How it works</p>
        <h2 className="mt-3 text-3xl font-bold tracking-tight text-ink sm:text-4xl">
          From first call to closed in three steps
        </h2>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {steps.map((s) => (
            <div
              key={s.n}
              className="rounded-2xl border border-line bg-surface p-6 shadow-card"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-navy text-base font-bold text-gold">
                {s.n}
              </span>
              <h3 className="mt-4 text-lg font-semibold text-ink">{s.title}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-ink-2">
                {s.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Situations() {
  const items = [
    ["Facing foreclosure", "Stop the clock with a fast, certain close."],
    ["Inherited or probate property", "We handle as-is condition and estate timelines."],
    ["Behind on payments", "Walk away clean — we pay standard closing costs."],
    ["Tired landlord / problem tenants", "Sell with tenants in place. We deal with it."],
    ["Divorce or separation", "A fast, neutral, written number both sides can trust."],
    ["Relocating on a deadline", "Pick your closing date — 2 weeks or 2 months."],
    ["House needs major repairs", "Fire damage, roof, foundation — truly as-is."],
    ["Vacant property", "Stop paying taxes and insurance on an empty house."],
  ];
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
      <p className="eyebrow">Situations we work with every week</p>
      <h2 className="mt-3 max-w-2xl text-3xl font-bold tracking-tight text-ink sm:text-4xl">
        Whatever the situation, you still deserve both numbers
      </h2>
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {items.map(([title, body]) => (
          <div key={title} className="rounded-xl border border-line bg-surface p-5">
            <h3 className="font-semibold text-ink">{title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-2">{body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function WhyBoth() {
  return (
    <section className="bg-surface-navy">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-24">
        <div>
          <p className="eyebrow">Why we can make both offers</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-ink-inverse sm:text-4xl">
            Investors can only buy. Agents can only list. We do both — so you
            don&rsquo;t get steered.
          </h2>
        </div>
        <div className="space-y-5 text-[15px] leading-relaxed text-ink-inverse-2">
          <p>
            A pure cash buyer profits only if you sell cheap. A pure listing
            agent earns only if you list. Each one will tell you their door is
            the right one — because it&rsquo;s the only door they have.
          </p>
          <p>
            We&rsquo;re licensed Pennsylvania REALTORS® who also buy and
            renovate houses for our own account. When we show you a cash offer
            next to a listing net sheet, we&rsquo;re fine with either answer —
            so the numbers can be honest, in writing, and yours to keep even
            if you walk away.
          </p>
          <p className="font-semibold text-ink-inverse">
            One walkthrough. Two offers. Zero pressure.
          </p>
        </div>
      </div>
    </section>
  );
}

function Faq() {
  const faqs = [
    {
      q: "Is the cash offer really free? What's the catch?",
      a: "No fees, no commissions, no obligation. We make money by renovating and reselling the house after we buy it — not by charging you. The trade-off is the price: a cash offer is below full retail value. That's exactly why we show you the listing net sheet next to it, so you can see the gap and decide if speed is worth it for you.",
    },
    {
      q: "Will you lower the price before closing?",
      a: `No. ${BRAND.pledge} ${BRAND.pledgeSub} We walk the property before we give you a number, so the number is real. The price on your written offer is the price on your closing statement.`,
    },
    {
      q: "How fast can you actually close?",
      a: "As little as 14 days when title is clean, and we can often move faster in urgent situations like foreclosure deadlines. Need more time instead? We'll set the closing date around your move.",
    },
    {
      q: "Do I have to make repairs or clean the house out?",
      a: "No. We buy strictly as-is — including major repairs, fire damage, code violations, or a house full of belongings. Take what you want; leave the rest.",
    },
    {
      q: "What if I'd net more by listing?",
      a: "Then the net sheet will show it, and we'll tell you so. Listing through our team is our other business — we're glad to earn it. Plenty of sellers take the listing option after seeing both numbers. That's the point.",
    },
    {
      q: "Are you agents or investors?",
      a: "Both, and we disclose it up front: Satish Brahmbhatt is a licensed PA real estate salesperson. When we buy your house for cash, we buy as principals for our own investment — not as your agent. When you choose the listing option, standard agency disclosures and a listing agreement apply, as required by Pennsylvania law.",
    },
  ];
  return (
    <section id="faq" className="mx-auto max-w-3xl scroll-mt-20 px-4 py-16 sm:px-6 lg:py-24">
      <p className="eyebrow text-center">Straight answers</p>
      <h2 className="mt-3 text-center text-3xl font-bold tracking-tight text-ink sm:text-4xl">
        Frequently asked questions
      </h2>
      <div className="mt-10 space-y-3">
        {faqs.map((f) => (
          <details
            key={f.q}
            className="group rounded-xl border border-line bg-surface p-5 open:shadow-card"
          >
            <summary className="cursor-pointer list-none text-[15px] font-semibold text-ink marker:content-none">
              <span className="flex items-center justify-between gap-4">
                {f.q}
                <span className="text-ink-3 transition-transform group-open:rotate-45">
                  +
                </span>
              </span>
            </summary>
            <p className="mt-3 text-[15px] leading-relaxed text-ink-2">{f.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

function GetOffers() {
  return (
    <section id="get-offers" className="scroll-mt-20 bg-surface-warm">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <p className="eyebrow">Get started</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            Get your cash offer and listing net sheet
          </h2>
          <p className="mt-4 text-[17px] leading-relaxed text-ink-2">
            Two minutes now, one walkthrough later, and you&rsquo;ll have both
            numbers in writing within 24 hours.
          </p>
        </div>
        <div className="mx-auto mt-10 max-w-2xl">
          <LeadForm />
        </div>
      </div>
    </section>
  );
}
