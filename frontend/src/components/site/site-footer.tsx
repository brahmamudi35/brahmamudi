import Link from "next/link";

import { Container } from "@/components/site/container";
import { Mark } from "@/components/site/logo";

const siteName = process.env.NEXT_PUBLIC_SITE_NAME ?? "brahmamudi";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t bg-muted/30">
      <Container className="flex flex-col gap-4 py-8 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Mark className="size-5 text-primary" />
          <span>
            © {new Date().getFullYear()} {siteName}. Vishwabrahmin matrimony.
          </span>
        </div>
        <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
          <Link href="/about" className="hover:text-foreground">
            About
          </Link>
          <Link href="/membership" className="hover:text-foreground">
            Membership
          </Link>
          <Link href="/privacy" className="hover:text-foreground">
            Privacy
          </Link>
          <Link href="/contact" className="hover:text-foreground">
            Contact
          </Link>
        </nav>
      </Container>
    </footer>
  );
}
