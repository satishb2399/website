"use client";

import { useState } from "react";
import { BRAND } from "@/lib/brand";

const TIMELINES = [
  { value: "asap", label: "As soon as possible" },
  { value: "30-days", label: "Within 30 days" },
  { value: "90-days", label: "1–3 months" },
  { value: "exploring", label: "Just exploring my options" },
] as const;

const CONDITIONS = [
  { value: "move-in-ready", label: "Move-in ready" },
  { value: "needs-some-work", label: "Needs some work" },
  { value: "major-repairs", label: "Needs major repairs" },
  { value: "not-sure", label: "Not sure" },
] as const;

type Status = "idle" | "submitting" | "success" | "error";

export function LeadForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());

    setStatus("submitting");
    setErrorMsg("");
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Something went wrong.");
      }
      setStatus("success");
      form.reset();
    } catch (err) {
      setStatus("error");
      setErrorMsg(
        err instanceof Error ? err.message : "Something went wrong.",
      );
    }
  }

  if (status === "success") {
    return (
      <div className="rounded-2xl border border-line bg-surface p-8 text-center shadow-card">
        <p className="text-lg font-semibold text-ink">
          Got it — your two offers are in motion.
        </p>
        <p className="mt-2 text-sm leading-relaxed text-ink-2">
          We&rsquo;ll reach out within one business day to schedule a quick
          walkthrough. After that you&rsquo;ll have a written cash offer and a
          listing net sheet, side by side. No obligation either way.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-line bg-surface p-6 shadow-card sm:p-8"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="mb-1.5 block text-sm font-medium text-ink">
            Property address
          </span>
          <input
            required
            name="address"
            autoComplete="street-address"
            placeholder="123 Market St, Harrisburg, PA"
            className="w-full rounded-lg border border-line-strong bg-background px-3.5 py-2.5 text-[15px] text-ink placeholder:text-ink-3 focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/15"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-ink">
            Your name
          </span>
          <input
            required
            name="name"
            autoComplete="name"
            placeholder="Full name"
            className="w-full rounded-lg border border-line-strong bg-background px-3.5 py-2.5 text-[15px] text-ink placeholder:text-ink-3 focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/15"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-ink">
            Phone
          </span>
          <input
            required
            name="phone"
            type="tel"
            autoComplete="tel"
            placeholder="(717) 555-0100"
            className="w-full rounded-lg border border-line-strong bg-background px-3.5 py-2.5 text-[15px] text-ink placeholder:text-ink-3 focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/15"
          />
        </label>

        <label className="block sm:col-span-2">
          <span className="mb-1.5 block text-sm font-medium text-ink">
            Email <span className="font-normal text-ink-3">(optional)</span>
          </span>
          <input
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            className="w-full rounded-lg border border-line-strong bg-background px-3.5 py-2.5 text-[15px] text-ink placeholder:text-ink-3 focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/15"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-ink">
            When do you want to sell?
          </span>
          <select
            name="timeline"
            defaultValue="asap"
            className="w-full rounded-lg border border-line-strong bg-background px-3.5 py-2.5 text-[15px] text-ink focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/15"
          >
            {TIMELINES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-ink">
            Condition of the home
          </span>
          <select
            name="condition"
            defaultValue="not-sure"
            className="w-full rounded-lg border border-line-strong bg-background px-3.5 py-2.5 text-[15px] text-ink focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/15"
          >
            {CONDITIONS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block sm:col-span-2">
          <span className="mb-1.5 block text-sm font-medium text-ink">
            Anything we should know?{" "}
            <span className="font-normal text-ink-3">(optional)</span>
          </span>
          <textarea
            name="notes"
            rows={3}
            placeholder="Tenants, repairs, timeline, inherited property…"
            className="w-full rounded-lg border border-line-strong bg-background px-3.5 py-2.5 text-[15px] text-ink placeholder:text-ink-3 focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/15"
          />
        </label>
      </div>

      {status === "error" && (
        <p className="mt-4 text-sm font-medium text-danger">{errorMsg}</p>
      )}

      <button
        type="submit"
        disabled={status === "submitting"}
        className="mt-5 w-full rounded-lg bg-navy px-5 py-3.5 text-[15px] font-semibold text-ink-inverse transition-colors hover:bg-navy-deep disabled:opacity-60"
      >
        {status === "submitting"
          ? "Sending…"
          : "Get my cash offer + listing net sheet"}
      </button>

      <p className="mt-3 text-center text-xs leading-relaxed text-ink-3">
        No obligation. No fees. {BRAND.pledgeSub}
      </p>
    </form>
  );
}
