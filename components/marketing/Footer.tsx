import Link from "next/link";
import { BRAND } from "@/lib/brand";

export function Footer() {
  return (
    <footer className="border-t border-line bg-surface-warm">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div className="max-w-xs">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-navy text-sm font-bold text-gold">
                SB
              </span>
              <span className="text-[15px] font-semibold tracking-tight text-ink">
                {BRAND.name}
              </span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-ink-2">
              We buy houses in {BRAND.market} — and we&rsquo;ll show you what
              listing nets you, too. {BRAND.pledge}
            </p>
          </div>

          <div className="text-sm text-ink-2">
            <p className="font-semibold text-ink">Service area</p>
            <p className="mt-2 max-w-sm leading-relaxed">
              {BRAND.serviceAreas.join(" · ")}
            </p>
            {BRAND.email && (
              <p className="mt-3">
                <a
                  href={`mailto:${BRAND.email}`}
                  className="font-medium text-navy underline underline-offset-2"
                >
                  {BRAND.email}
                </a>
              </p>
            )}
          </div>
        </div>

        {/* PA licensee disclosure — required, do not remove (CLAUDE.md §5) */}
        <p className="mt-10 border-t border-line pt-6 text-xs leading-relaxed text-ink-3">
          {BRAND.licenseeDisclosure}
        </p>

        <div className="mt-6 flex flex-col gap-2 text-xs text-ink-3 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {BRAND.legalName}. All rights
            reserved.
          </p>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:text-ink-2">
              Privacy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
