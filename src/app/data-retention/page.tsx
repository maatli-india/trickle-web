import type { Metadata } from "next";
import { LegalList, LegalPage, LegalSection } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Data Retention | Trickle",
  description: "What happens to your information after your Trickle account is deleted.",
};

export default function DataRetentionPage() {
  return (
    <LegalPage
      eyebrow="Trickle data retention"
      title="Data Retention"
      updated="5 August 2026"
      intro="This policy describes the retention target for information connected to a deleted Trickle account. Specific legal, tax, payment-provider, or dispute requirements may override the target below."
      sections={[
        { href: "#immediate", label: "Immediate actions" },
        { href: "#standard", label: "Standard retention" },
        { href: "#records", label: "Records covered" },
        { href: "#holds", label: "Legal holds" },
        { href: "#request", label: "Your request" },
      ]}
    >
      <LegalSection id="immediate" title="1. Immediate deletion actions">
        <p>When account deletion succeeds, access and refresh sessions, device sessions, and push-notification tokens are revoked. Direct profile identifiers are removed or anonymized where permitted, and user-owned profile files are scheduled for purge where storage deletion succeeds.</p>
      </LegalSection>

      <LegalSection id="standard" title="2. Standard retention target">
        <p>Operational records may be retained for up to 30 days after deletion for payment reconciliation, refunds, payouts, disputes, fraud and safety reviews, parcel and trip reconciliation, and support follow-up. After that period, records are deleted or irreversibly anonymized according to our cleanup process.</p>
      </LegalSection>

      <LegalSection id="records" title="3. Records covered">
        <LegalList>
          <li>Payment and payout records</li>
          <li>Parcel requests and matches</li>
          <li>Travel plans</li>
          <li>Chat messages and attachments</li>
          <li>Reports and dispute records</li>
          <li>Fraud and safety records</li>
          <li>Tax records</li>
          <li>Notifications, audit events, and support history</li>
        </LegalList>
      </LegalSection>

      <LegalSection id="holds" title="4. Legal holds and exceptions">
        <p>Records connected to an active dispute, safety incident, fraud investigation, tax requirement, court order, regulatory obligation, or legal hold may remain longer than 30 days. Retained data under a hold is not used for marketing or personalization.</p>
      </LegalSection>

      <LegalSection id="request" title="5. Your deletion request">
        <p>You can start deletion from <a className="font-semibold text-[#e85b43] underline" href="/account-deletion">Account deletion</a> or by contacting Support. Deletion may be delayed or limited where identity verification, an open payment, dispute, safety issue, or legal obligation requires it. Contact <a className="font-semibold text-[#e85b43] underline" href="mailto:support@trickle.org.in">support@trickle.org.in</a> for deletion questions.</p>
      </LegalSection>
    </LegalPage>
  );
}
