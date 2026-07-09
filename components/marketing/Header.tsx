import Link from "next/link";
import { BRAND } from "@/lib/brand";

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-navy text-sm font-bold text-gold">
            SB
          </span>
          <span className="text-[15px] font-semibold tracking-tight text-ink">
            {BRAND.name}
          </span>
        </Link>

        <nav className="hidden items-center gap-7 text-sm font-medium text-ink-2 md:flex">
          <Link href="/#how-it-works" className="hover:text-ink">
            How it works
          </Link>
          <Link href="/#two-offers" className="hover:text-ink">
            Two offers
          </Link>
          <Link href="/calculator" className="hover:text-ink">
            Net-sheet calculator
          </Link>
          <Link href="/#faq" className="hover:text-ink">
            FAQ
          </Link>
        </nav>

        <Link
          href="/#get-offers"
          className="rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-ink-inverse transition-colors hover:bg-navy-deep"
        >
          Get my two offers
        </Link>
      </div>
    </header>
  );
}
