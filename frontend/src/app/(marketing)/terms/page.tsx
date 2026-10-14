import type { Metadata } from "next";
import Link from "next/link";

import { LegalPage, Section } from "@/components/site/legal-page";
import { SITE } from "@/lib/site-info";

export const metadata: Metadata = {
  title: "Terms of service",
  description: `Terms and conditions for using ${SITE.name}.`,
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of service"
      updated={SITE.legalUpdated}
      intro={
        <p>
          These terms govern your use of {SITE.url} (&ldquo;brahmamudi&rdquo;,
          &ldquo;we&rdquo;, &ldquo;us&rdquo;), operated by {SITE.operator},{" "}
          {SITE.address.slice(0, 2).join(", ")}. By registering or using the
          site you agree to them. If you do not agree, please do not use the
          service.
        </p>
      }
    >
      <Section title="1. The service">
        <p>
          brahmamudi is an online matrimony platform for the Vishwabrahmin
          community. We provide a place for prospective brides, grooms and
          their families to publish bio-data, search profiles and contact each
          other. We are a platform only — we are not a marriage bureau, we do
          not arrange marriages and we do not guarantee that you will find a
          match.
        </p>
      </Section>

      <Section title="2. Eligibility">
        <ul>
          <li>
            The person the profile is for must be legally eligible to marry in
            India — at least 21 years old for men and 18 years old for women —
            and must not be currently married.
          </li>
          <li>
            A parent, sibling or guardian may create and manage a profile on
            behalf of a family member, with that person&apos;s knowledge and
            consent.
          </li>
          <li>One profile per person. Duplicate profiles may be removed.</li>
          <li>The service is for personal matrimonial purposes only, not for commercial use.</li>
        </ul>
      </Section>

      <Section title="3. Your account and profile">
        <ul>
          <li>
            You must give true, complete and current information — including
            age, marital status, education, occupation, family and horoscope
            details — and keep it up to date.
          </li>
          <li>Photos must be recent and of the person the profile is for.</li>
          <li>
            You are responsible for keeping your login details confidential and
            for all activity on your account.
          </li>
          <li>
            We may review, edit for formatting, verify, hide or remove profiles,
            photos and documents that are incomplete, misleading or break these
            terms.
          </li>
        </ul>
      </Section>

      <Section title="4. Acceptable use">
        <p>You agree not to:</p>
        <ul>
          <li>create a fake profile or impersonate anyone;</li>
          <li>harass, abuse, threaten or defraud other members, or ask them for money;</li>
          <li>demand or offer dowry, which is prohibited under the Dowry Prohibition Act, 1961;</li>
          <li>
            copy, collect or share other members&apos; contact details or
            photos outside the purpose of finding a match, or use them for
            marketing;
          </li>
          <li>post content that is obscene, defamatory, hateful or unlawful;</li>
          <li>attempt to access accounts or data that are not yours, or disrupt the site.</li>
        </ul>
        <p>
          We may suspend or terminate accounts that break these rules, without
          refund, and report unlawful activity to the authorities.
        </p>
      </Section>

      <Section title="5. Your own due diligence">
        <p>
          We check profiles where we can, and a &ldquo;verified&rdquo; badge means our
          team has reviewed that profile, but we cannot guarantee the accuracy
          of information members provide. Before taking any decision, families
          should independently verify a prospective match&apos;s identity,
          background, family, education, employment and health. Meet in safe,
          public places and never send money to someone you have met online.
        </p>
      </Section>

      <Section title="6. Memberships and payments">
        <ul>
          <li>
            Registration is free. Paid memberships unlock contact details and
            higher daily limits as described on our{" "}
            <Link href="/pricing">pricing page</Link>.
          </li>
          <li>
            Fees are one-time payments for the stated validity period; memberships
            do not renew automatically. Prices are in INR and may change for
            future purchases — changes do not affect a membership already paid for.
          </li>
          <li>
            Payment is made by UPI or bank transfer to the account shown on the
            membership page; your plan is activated once we confirm the payment.
            Never share your UPI PIN or OTP with anyone, including our staff.
          </li>
          <li>
            Refunds and cancellations are covered by our{" "}
            <Link href="/refund-policy">refund &amp; cancellation policy</Link>.
          </li>
          <li>
            Unused contact views, interests or validity cannot be carried
            forward, transferred to another person or exchanged for cash.
          </li>
        </ul>
      </Section>

      <Section title="7. Content you share">
        <p>
          You keep ownership of the bio-data, photos and documents you upload.
          You give us permission to store them and show them to other members
          and visitors as part of the service, as described in our{" "}
          <Link href="/privacy">privacy policy</Link>. You confirm you have the
          right to share them.
        </p>
      </Section>

      <Section title="8. Closing your account">
        <p>
          You can ask us to hide or delete your profile at any time by contacting
          us. We may suspend or close accounts that break these terms or are
          inactive for a long period. Closing an account does not by itself
          entitle you to a refund.
        </p>
      </Section>

      <Section title="9. Limitation of liability">
        <p>
          The service is provided &ldquo;as is&rdquo;. To the extent allowed by law, we
          are not liable for the conduct of any member, for decisions you make
          based on information on the site, or for indirect or consequential
          loss. Our total liability to you for any claim is limited to the fees
          you paid us in the 12 months before the claim.
        </p>
      </Section>

      <Section title="10. Governing law">
        <p>
          These terms are governed by the laws of India. Any dispute is subject
          to the exclusive jurisdiction of the courts at {SITE.jurisdiction}.
        </p>
      </Section>

      <Section title="11. Changes and contact">
        <p>
          We may update these terms; the date at the top shows the latest
          version, and continued use of the site means you accept the changes.
          Questions? Email <a href={`mailto:${SITE.email}`}>{SITE.email}</a>, call{" "}
          {SITE.phone} or see our <Link href="/contact">contact page</Link>.
        </p>
      </Section>
    </LegalPage>
  );
}
