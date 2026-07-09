import type { Metadata } from "next";
import { Header } from "@/components/marketing/Header";
import { Footer } from "@/components/marketing/Footer";
import { Calculator } from "./Calculator";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = {
  title: `Net-Proceeds Calculator — Cash Offer vs. Listing | ${BRAND.name}`,
  description:
    "See what you'd actually walk away with: a cash offer vs. listing on the open market, side by side, with every cost shown.",
};

export default function CalculatorPage() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:py-16">
          <p className="eyebrow">Net-proceeds calculator</p>
          <h1 className="mt-3 max-w-2xl text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            What would you actually walk away with?
          </h1>
          <p className="mt-4 max-w-2xl text-[17px] leading-relaxed text-ink-2">
            The list price isn&rsquo;t what you keep. Commissions, closing
            costs, concessions, and months of carrying costs all come out
            first. Put in your numbers and compare an as-is cash sale against
            listing on the open market — honestly, side by side.
          </p>
          <div className="mt-10">
            <Calculator />
          </div>
          <p className="mt-8 max-w-3xl text-xs leading-relaxed text-ink-3">
            Estimates only, using typical {BRAND.marketShort} listing costs.
            Your written cash offer comes after a walkthrough — and{" "}
            {BRAND.pledge.toLowerCase()} This tool is not an offer, an
            appraisal, or a broker price opinion.
          </p>
        </section>
      </main>
      <Footer />
    </>
  );
}
