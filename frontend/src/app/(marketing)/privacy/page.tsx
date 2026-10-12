import type { Metadata } from "next";
import Link from "next/link";

import { LegalPage, Section } from "@/components/site/legal-page";
import { SITE } from "@/lib/site-info";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: `How ${SITE.name} collects, uses and protects your personal data.`,
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy policy"
      updated={SITE.legalUpdated}
      intro={
        <p>
          {SITE.operator} (&ldquo;we&rdquo;) runs {SITE.url}. This policy explains what
          personal data we collect, why, who can see it and the choices you
          have. We process personal data in line with the Information
          Technology Act, 2000 and the Digital Personal Data Protection Act,
          2023.
        </p>
      }
    >
      <Section title="1. What we collect">
        <ul>
          <li>
            <strong>Account details</strong> — name, email address, mobile
            number and password (stored only in encrypted, hashed form). If you
            sign in with Google, we receive your name, email address and Google
            account ID.
          </li>
          <li>
            <strong>Profile / bio-data</strong> — gender, date of birth, height,
            marital status, sub-caste, gothram, education, occupation, income,
            family details, location, partner preferences and anything else you
            choose to add.
          </li>
          <li>
            <strong>Horoscope</strong> — nakshatram, raasi, birth details and any
            horoscope document you upload.
          </li>
          <li><strong>Photos</strong> you upload.</li>
          <li>
            <strong>Contact details</strong> — your phone numbers, parents&apos;
            phone numbers and address.
          </li>
          <li>
            <strong>Activity</strong> — interests sent and received, shortlists,
            saved searches, profiles you view and who viewed yours, and contact
            details you unlock.
          </li>
          <li>
            <strong>Payments</strong> — plan, amount, date and the transaction
            reference and status returned by PayU. We never receive or store
            your card, UPI or net-banking credentials.
          </li>
          <li>
            <strong>Technical data</strong> — IP address, browser type and basic
            logs needed to run and secure the site.
          </li>
        </ul>
      </Section>

      <Section title="2. Why we use it">
        <ul>
          <li>to create and show your profile and find suitable matches (including porutham checks);</li>
          <li>to let members send interests and, with a paid membership, contact each other;</li>
          <li>to verify profiles, moderate photos and documents, and prevent fraud and misuse;</li>
          <li>to process membership payments and keep payment records;</li>
          <li>
            to send service emails — verification and password-reset codes,
            interest notifications and, unless you switch it off in your
            account, a weekly match digest;
          </li>
          <li>to answer your support requests and meet legal obligations.</li>
        </ul>
        <p>
          We do <strong>not</strong> sell your personal data or share it with
          advertisers.
        </p>
      </Section>

      <Section title="3. Who can see your information">
        <ul>
          <li>
            <strong>Signed-in members</strong> of the opposite gender can see
            your profile, approved photos and horoscope details (not your
            contact details). Profiles are not shown to visitors who are not
            signed in.
          </li>
          <li>
            <strong>Your contact details and horoscope document</strong> are
            shown only to paid members who choose to unlock your profile, which
            uses one of their contact views. Members you shortlist, send interests
            to or visit may see that activity.
          </li>
          <li>
            <strong>Our team</strong> can see profiles and account data to
            verify, moderate and support members.
          </li>
          <li>
            <strong>Service providers</strong> that process data for us under
            contract: PayU (payments), Railway and Vercel (hosting and
            databases), Resend (email delivery) and Google (sign-in, if you use
            it). Some of these providers store data on servers outside India.
          </li>
          <li>
            <strong>Authorities</strong>, when required by law or to protect
            members from fraud or harm.
          </li>
        </ul>
      </Section>

      <Section title="4. Cookies and local storage">
        <p>
          We use your browser&apos;s local storage to keep you signed in and to
          remember settings such as light / dark theme. We do not use
          advertising or tracking cookies.
        </p>
      </Section>

      <Section title="5. How long we keep data">
        <p>
          We keep your profile while your account is open. When you ask us to
          delete your account, we remove your profile, photos and documents
          within 30 days, except records we must keep by law (such as payment
          and tax records), which are kept for the period the law requires.
        </p>
      </Section>

      <Section title="6. Security">
        <p>
          Data is sent over encrypted HTTPS connections, passwords are hashed,
          and access to member data is limited to staff who need it. No system
          is perfectly secure, so please use a strong password and never share
          your login or one-time codes — our staff will never ask for them.
        </p>
      </Section>

      <Section title="7. Your rights and choices">
        <ul>
          <li>View and edit most of your profile yourself at any time.</li>
          <li>Switch off the weekly digest email from your account page.</li>
          <li>
            Ask us for a copy of your data, to correct it, to hide your profile
            or to delete your account — email{" "}
            <a href={`mailto:${SITE.email}`}>{SITE.email}</a> from your registered
            email address.
          </li>
          <li>Withdraw consent at any time; this may mean we can no longer provide the service.</li>
        </ul>
      </Section>

      <Section title="8. Children">
        <p>
          The service is only for people who are legally old enough to marry in
          India. We do not knowingly collect data about anyone younger.
        </p>
      </Section>

      <section id="grievance">
        <h2 className="font-heading text-xl font-semibold">9. Grievance officer</h2>
        <div className="mt-3 text-[0.95rem] text-foreground/90">
          <p>
            For any complaint or concern about your data or content on the site,
            contact our Grievance Officer:
          </p>
          <p className="mt-3">
            <strong>{SITE.grievanceOfficer}</strong>, Grievance Officer
            <br />
            {SITE.operator}
            <br />
            {SITE.address.join(", ")}
            <br />
            Email: <a href={`mailto:${SITE.email}`}>{SITE.email}</a> · Phone: {SITE.phone}
          </p>
          <p className="mt-3">
            We acknowledge complaints within 48 hours and aim to resolve them
            within 15 days.
          </p>
        </div>
      </section>

      <Section title="10. Changes">
        <p>
          We may update this policy; the date at the top shows the latest
          version. See also our <Link href="/terms">terms of service</Link>.
        </p>
      </Section>
    </LegalPage>
  );
}
