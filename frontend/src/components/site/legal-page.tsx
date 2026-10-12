import { Container } from "@/components/site/container";

/** Shared shell for the long-form public pages (terms, privacy, refunds…). */
export function LegalPage({
  title,
  intro,
  updated,
  children,
}: {
  title: string;
  intro?: React.ReactNode;
  updated?: string;
  children: React.ReactNode;
}) {
  return (
    <Container className="max-w-3xl py-12 sm:py-16">
      <header className="border-b pb-6">
        <h1 className="font-heading text-3xl font-semibold sm:text-4xl">{title}</h1>
        {updated && (
          <p className="mt-2 text-sm text-muted-foreground">Last updated: {updated}</p>
        )}
        {intro && <div className="mt-4 text-muted-foreground">{intro}</div>}
      </header>
      <div className="mt-8 space-y-8 leading-relaxed [&_a]:text-primary [&_a]:underline-offset-2 hover:[&_a]:underline [&_li]:mt-1.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_p+p]:mt-3 [&_ul]:list-disc [&_ul]:pl-5">
        {children}
      </div>
    </Container>
  );
}

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-heading text-xl font-semibold">{title}</h2>
      <div className="mt-3 text-[0.95rem] text-foreground/90">{children}</div>
    </section>
  );
}
