"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  netSheetComparison,
  usd,
  type NetSheetSide,
} from "@/lib/underwriting";

/**
 * Seller-facing inputs. The cash-offer field is prefilled with a
 * deliberately rough placeholder (78% of as-is value) purely so the
 * comparison renders — the real number always comes from a walkthrough.
 */
const DEFAULT_AS_IS = 220_000;
const PLACEHOLDER_CASH_RATIO = 0.78;

function NumberField({
  label,
  hint,
  value,
  onChange,
  step = 1000,
}: {
  label: string;
  hint?: string;
  value: number;
  onChange: (n: number) => void;
  step?: number;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-ink">{label}</span>
      <div className="relative">
        <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-ink-3">
          $
        </span>
        <input
          type="number"
          min={0}
          step={step}
          value={Number.isFinite(value) ? value : 0}
          onChange={(e) => onChange(e.currentTarget.valueAsNumber || 0)}
          className="w-full rounded-lg border border-line-strong bg-surface py-2.5 pl-8 pr-3.5 text-[15px] text-ink focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/15"
        />
      </div>
      {hint && <span className="mt-1 block text-xs text-ink-3">{hint}</span>}
    </label>
  );
}

function SideCard({
  title,
  tag,
  side,
  highlight,
  timeline,
}: {
  title: string;
  tag: string;
  side: NetSheetSide;
  highlight?: boolean;
  timeline: string;
}) {
  return (
    <div
      className={`rounded-2xl border p-6 ${
        highlight
          ? "border-gold bg-gold-light/25 shadow-card"
          : "border-line bg-surface"
      }`}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-ink">{title}</h3>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
            highlight ? "bg-navy text-ink-inverse" : "bg-surface-warm text-ink-2"
          }`}
        >
          {tag}
        </span>
      </div>

      <dl className="mt-5 space-y-2.5 text-[15px]">
        <div className="flex justify-between font-medium text-ink">
          <dt>{highlight ? "Cash offer" : "Sale price"}</dt>
          <dd>{usd(side.gross)}</dd>
        </div>
        {side.deductions.map((d) => (
          <div key={d.label} className="flex justify-between text-ink-2">
            <dt className="pr-4">{d.label}</dt>
            <dd>{d.amount === 0 ? "$0" : `− ${usd(d.amount)}`}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-5 border-t border-line pt-4">
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-semibold text-ink-2">
            You walk away with*
          </span>
          <span className="text-2xl font-bold tracking-tight text-ink">
            {usd(side.walkAway)}
          </span>
        </div>
        <p className="mt-1 text-right text-xs text-ink-3">{timeline}</p>
      </div>
    </div>
  );
}

export function Calculator() {
  const [asIsPrice, setAsIsPrice] = useState(DEFAULT_AS_IS);
  const [cashOffer, setCashOffer] = useState(
    Math.round((DEFAULT_AS_IS * PLACEHOLDER_CASH_RATIO) / 1000) * 1000,
  );
  const [cashTouched, setCashTouched] = useState(false);
  const [mortgagePayoff, setMortgagePayoff] = useState(0);
  const [monthlyCarry, setMonthlyCarry] = useState(1600);

  function handleAsIsChange(n: number) {
    setAsIsPrice(n);
    if (!cashTouched) {
      setCashOffer(Math.round((n * PLACEHOLDER_CASH_RATIO) / 1000) * 1000);
    }
  }

  const result = useMemo(
    () =>
      netSheetComparison({ asIsPrice, cashOffer, mortgagePayoff, monthlyCarry }),
    [asIsPrice, cashOffer, mortgagePayoff, monthlyCarry],
  );

  const listWins = result.listAdvantage > 0;

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(260px,340px)_1fr]">
      <div className="space-y-5 rounded-2xl border border-line bg-surface-warm p-6 lg:self-start">
        <NumberField
          label="What your house would list for as-is"
          hint="A realistic open-market price in today's condition."
          value={asIsPrice}
          onChange={handleAsIsChange}
          step={5000}
        />
        <NumberField
          label="Example cash offer"
          hint="Prefilled as a rough example — your real written offer comes after one walkthrough."
          value={cashOffer}
          onChange={(n) => {
            setCashTouched(true);
            setCashOffer(n);
          }}
          step={5000}
        />
        <NumberField
          label="Mortgage payoff (if any)"
          hint="Remaining loan balance and liens paid off at closing — comes out of both options."
          value={mortgagePayoff}
          onChange={setMortgagePayoff}
          step={5000}
        />
        <NumberField
          label="Monthly cost of keeping the house"
          hint="Mortgage payment, taxes, insurance, utilities while it sits on the market."
          value={monthlyCarry}
          onChange={setMonthlyCarry}
          step={100}
        />
      </div>

      <div>
        <div className="grid gap-5 md:grid-cols-2">
          <SideCard
            title="Sell for cash"
            tag="Fast & certain"
            side={result.cash}
            highlight
            timeline="In as little as 14 days"
          />
          <SideCard
            title="List on the market"
            tag="Top dollar"
            side={result.list}
            timeline="Typically 60–120 days"
          />
        </div>

        <div className="mt-5 rounded-xl border border-line bg-surface p-5 text-[15px] leading-relaxed text-ink-2">
          {listWins ? (
            <p>
              With these numbers, listing nets you about{" "}
              <strong className="text-ink">{usd(result.listAdvantage)}</strong>{" "}
              more — the question is whether that&rsquo;s worth the months,
              showings, and repair negotiations. Some sellers say yes, some
              say no. Both are right.
            </p>
          ) : (
            <p>
              With these numbers, the cash sale actually nets you{" "}
              <strong className="text-ink">
                {usd(Math.abs(result.listAdvantage))}
              </strong>{" "}
              more than listing — carrying costs and selling costs eat the
              difference. Worth a real walkthrough to confirm.
            </p>
          )}
          <p className="mt-3">
            <Link
              href="/#get-offers"
              className="font-semibold text-navy underline underline-offset-2"
            >
              Get both numbers in writing for your house →
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
