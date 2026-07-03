import Link from "next/link";
import { Logo } from "./Logo";
import { config } from "@/lib/config";

export function SiteHeader() {
  return (
    <header className="w-full border-b border-line/70">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
        <Link href="/" aria-label="Gut Freedom home">
          <Logo />
        </Link>
        <a
          href={config.brand.bookCallUrl}
          className="rounded-full border border-teal-deep/20 px-4 py-2 text-sm font-semibold text-teal-deep transition hover:bg-teal-deep hover:text-white"
        >
          Book a free call
        </a>
      </div>
    </header>
  );
}
