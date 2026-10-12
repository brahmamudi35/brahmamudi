import type { Metadata } from "next";
import Link from "next/link";

import { LegalPage, Section } from "@/components/site/legal-page";
import { SITE } from "@/lib/site-info";

export const metadata: Metadata = {
  title: "About us",
  description: `${SITE.name} is a matrimony service for the Vishwabrahmin community, run by ${SITE.operator}, Hyderabad.`,
};

export default function AboutPage() {
  return (
    <LegalPage
      title="About brahmamudi"
      intro={
        <p>
          A matrimony service by and for the Vishwabrahmin (Vishwakarma)
          community, run by <strong>{SITE.operator}</strong>, Hyderabad.
        </p>
      }
    >
      <Section title="Who we are">
        <p>
          {SITE.operator} has been helping Vishwabrahmin families find
          suitable alliances since 2016 through brahmamudi.com. A{" "}
          <em>mudi</em> is a knot — the marriage knot our families tie with
          trust, not chance — and that is what we try to bring online: full
          bio-data, proper horoscope details and a team that understands what
          our families are looking for.
        </p>
        <p>
          We serve all five sub-communities — Goldsmith (Ausula /
          Swarnakara), Carpenter (Vadla / Vardhaki), Blacksmith (Kammari /
          Karmara), Kanchari (Kansara) and Shilpi (Sthapati) — across Telangana,
          Andhra Pradesh and beyond.
        </p>
      </Section>

      <Section title="What we offer">
        <ul>
          <li>Free registration with detailed family, education and career bio-data.</li>
          <li>Horoscope details (nakshatram, raasi) and an automatic porutham check between profiles.</li>
          <li>Search by sub-caste, age, region, education and more, plus daily match suggestions.</li>
          <li>Photo and profile review by our team, and a verified badge for checked profiles.</li>
          <li>
            Paid memberships to view contact details and connect directly — see{" "}
            <Link href="/pricing">plans &amp; pricing</Link>.
          </li>
          <li>Personal assistance by phone and WhatsApp.</li>
        </ul>
      </Section>

      <Section title="Our approach">
        <p>
          No commission, no hidden charges and no percentage on marriages — you
          pay only the published membership fee. Your contact details are shown
          only to paid members you choose to connect with, and you can contact
          us any time to correct or remove your profile.
        </p>
      </Section>

      <Section title="Get in touch">
        <p>
          Questions, help with your profile or a success story to share?{" "}
          <Link href="/contact">Contact us</Link> — we&apos;re happy to help.
        </p>
      </Section>
    </LegalPage>
  );
}
