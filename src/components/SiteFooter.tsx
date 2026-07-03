import { config } from "@/lib/config";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-line/70">
      <div className="mx-auto max-w-5xl px-5 py-8 text-center">
        <p className="mx-auto max-w-2xl text-xs italic leading-relaxed text-muted">
          This tool is education, not medical advice. Plans are built on
          population-level patterns, not on your labs, history or how your body
          is responding this week. It is not a substitute for care from your
          doctor — especially during an active flare. Always keep your medical
          team in the loop.
        </p>
        <p className="mt-4 text-sm font-semibold text-teal-deep">
          {config.brand.name} · {config.brand.author}
        </p>
        <a
          href={config.brand.site}
          className="text-xs text-muted underline-offset-2 hover:underline"
        >
          www.sameerdossani.net
        </a>
      </div>
    </footer>
  );
}
