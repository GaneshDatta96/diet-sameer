export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <span className="flex items-center gap-1" aria-hidden>
        <span className="h-2.5 w-2.5 rounded-full bg-green" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber" />
        <span className="h-2.5 w-2.5 rounded-full bg-rust" />
      </span>
      <span className="font-display font-extrabold tracking-tight text-teal-deep">
        Gut<span className="text-amber">Freedom</span>
      </span>
    </span>
  );
}
