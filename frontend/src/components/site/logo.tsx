import Link from "next/link";

import { cn } from "@/lib/utils";

const siteName = process.env.NEXT_PUBLIC_SITE_NAME ?? "brahmamudi";

export function Logo({
  className,
  href = "/",
  withWordmark = true,
}: {
  className?: string;
  href?: string;
  withWordmark?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn("inline-flex items-center gap-2 font-heading", className)}
    >
      <Mark className="size-7 text-primary" />
      {withWordmark && (
        <span className="text-xl font-semibold tracking-tight text-foreground">
          {siteName}
        </span>
      )}
    </Link>
  );
}

/** Two interlocked rings — the "mudi" (marriage knot). */
export function Mark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
      <circle cx="12" cy="16" r="8" stroke="currentColor" strokeWidth="2.5" />
      <circle
        cx="20"
        cy="16"
        r="8"
        stroke="currentColor"
        strokeWidth="2.5"
        opacity="0.55"
      />
    </svg>
  );
}
