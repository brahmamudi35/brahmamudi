import type { Metadata } from "next";
import Link from "next/link";

import { LegalPage, Section } from "@/components/site/legal-page";
import { SITE } from "@/lib/site-info";

export const metadata: Metadata = {
  title: "Refund & cancellation policy",
  description: `Refund and cancellation policy for ${SITE.name} paid memberships.`,
};

export default function RefundPolicyPage() {
  return (
    <LegalPage
      title="Refund & cancellation policy"
      updated={SITE.legalUpdated}
      intro={
        <p>
          This policy applies to paid memberships bought on {SITE.url} from{" "}
          {SITE.operator}. Registration and a basic profile are free, so we
          encourage you to explore the site before upgrading.
        </p>
      }
    >
      <Section title="1. Memberships are a digital service">
        <p>
          A paid membership is activated on your account as soon as we confirm
          your payment, and its benefits (contact views, higher interest
          limits, horoscope documents) can be used straight away. Memberships
          are one-time purchases for a fixed validity and do{" "}
          <strong>not</strong> renew automatically, so there is nothing to
          cancel at the end of the period.
        </p>
      </Section>

      <Section title="2. Cancellation">
        <ul>
          <li>
            If you change your mind before we activate your membership, tell us
            on WhatsApp or email and we will refund the full amount.
          </li>
          <li>
            Once a membership is active it cannot be cancelled for a pro-rata
            refund. You may stop using it or ask us to hide or delete your
            profile at any time.
          </li>
        </ul>
      </Section>

      <Section title="3. When we refund">
        <p>We give a full refund of the amount paid when:</p>
        <ul>
          <li>you were charged more than once for the same membership (duplicate payment);</li>
          <li>
            money was debited but your membership was not activated, and we
            are unable to activate it within 48 hours of you reporting it;
          </li>
          <li>you were charged an amount different from the published price;</li>
          <li>
            you request a refund within <strong>7 days</strong> of payment and
            have not unlocked any member&apos;s contact details with that
            membership.
          </li>
        </ul>
      </Section>

      <Section title="4. When we do not refund">
        <ul>
          <li>after contact details have been unlocked using the membership, or after 7 days from payment;</li>
          <li>because a match was not found, or a member did not respond or declined an interest;</li>
          <li>
            when an account is suspended or removed for breaking our{" "}
            <Link href="/terms">terms of service</Link> (for example, a fake
            profile or misuse of contact details);
          </li>
          <li>for unused contact views, interests or remaining validity.</li>
        </ul>
      </Section>

      <Section title="5. How to request a refund">
        <p>
          Email <a href={`mailto:${SITE.email}`}>{SITE.email}</a> or call / WhatsApp{" "}
          {SITE.phone} with your registered email, profile number (e.g.
          6220), payment date, amount and the UPI / bank transaction
          reference (UTR). We reply
          within 2 working days.
        </p>
      </Section>

      <Section title="6. Refund timeline">
        <p>
          Approved refunds are sent back to the UPI ID or bank account the
          payment came from within <strong>7 working days</strong>. The exact
          time for the money to appear depends on your bank.
        </p>
      </Section>

      <Section title="7. Questions">
        <p>
          See our <Link href="/pricing">plans &amp; pricing</Link> or{" "}
          <Link href="/contact">contact us</Link> — we&apos;re glad to help before
          you buy.
        </p>
      </Section>
    </LegalPage>
  );
}
