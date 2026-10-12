import Link from "next/link";

import { Container } from "@/components/site/container";
import { Mark } from "@/components/site/logo";
import { SITE } from "@/lib/site-info";

const siteName = process.env.NEXT_PUBLIC_SITE_NAME ?? "brahmamudi";

const LINKS = [
  { href: "/about", label: "About" },
  { href: "/pricing", label: "Pricing" },
  { href: "/contact", label: "Contact" },
  { href: "/terms", label: "Terms" },
  { href: "/privacy", label: "Privacy" },
  { href: "/refund-policy", label: "Refund policy" },
];

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t bg-muted/30">
      <Container className="flex flex-col gap-4 py-8 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Mark className="size-5 text-primary" />
            <span>
              © {new Date().getFullYear()} {siteName}. Vishwabrahmin matrimony.
            </span>
          </div>
          <p className="text-xs">
            {SITE.operator}, {SITE.address[0]}, {SITE.address[1]} ·{" "}
            <a href={`mailto:${SITE.email}`} className="hover:text-foreground">
              {SITE.email}
            </a>{" "}
            · {SITE.phone}
          </p>
        </div>
        <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="hover:text-foreground">
              {l.label}
            </Link>
          ))}
        </nav>
      </Container>
    </footer>
  );
}
