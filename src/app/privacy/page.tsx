import type { Metadata } from "next";
import { LegalList, LegalPage, LegalSection } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Privacy Policy | Trickle",
  description: "How Trickle collects, uses, shares, and protects personal information.",
};

export default function PrivacyPolicyPage() {
  return (
    <LegalPage
      eyebrow="Trickle privacy"
      title="Privacy Policy"
      updated="5 August 2026"
      intro="This policy explains how Trickle handles information when you use our mobile app, website, and people-powered delivery services. We collect what we need to help a parcel follow the journey, keep users safe, and support payments and disputes."
      sections={[
        { href: "#overview", label: "Overview" },
        { href: "#information", label: "Information" },
        { href: "#use", label: "How we use it" },
        { href: "#sharing", label: "Sharing" },
        { href: "#consent", label: "Consent" },
        { href: "#security", label: "Security" },
        { href: "#retention", label: "Retention" },
        { href: "#rights", label: "Your choices" },
        { href: "#incidents", label: "Incidents" },
        { href: "#contact", label: "Contact" },
      ]}
    >
      <LegalSection id="overview" title="1. Overview">
        <p>Trickle connects people who need to send parcels with travelers already going along a route. Trickle is a coordination platform; the sender and traveler remain responsible for the accuracy of their information, the parcel, and the agreed handoff.</p>
        <p>By using Trickle, you acknowledge this policy. Where the law requires consent, we will request it separately and you can change your choice where the relevant feature allows.</p>
      </LegalSection>

      <LegalSection id="information" title="2. Information we collect">
        <p><strong>Account information:</strong> phone number, OTP verification records, name, email address, date of birth, gender where provided, profile photo, referral information, and identity-verification details.</p>
        <p><strong>Delivery information:</strong> parcel descriptions, pickup and drop locations, route coordinates, travel dates, delivery deadlines, parcel images or attachments, agreed prices, handoff confirmations, ratings, reports, and support history.</p>
        <p><strong>Messages and content:</strong> chat messages, attachments, shared location pins, reports, and other content you submit through the service.</p>
        <p><strong>Payment and payout information:</strong> payment status, transaction identifiers, refund information, payout status, and bank-account details needed for traveler payouts. Payment credentials are handled by our payment provider where possible.</p>
        <p><strong>Device and technical information:</strong> device model, operating system, app version, country, device identifiers, IP address, log data, crash information, and push-notification token.</p>
        <p><strong>Location and address information:</strong> location or route information that you enter or choose, and device location when you grant permission for address suggestions or nearby traveler matching.</p>
        <p><strong>Support information:</strong> messages, attachments, contact details, and information needed to investigate a question, payment issue, safety report, or dispute.</p>
      </LegalSection>

      <LegalSection id="use" title="3. How we use information">
        <LegalList>
          <li>Create and secure accounts using phone verification and session controls.</li>
          <li>Suggest routes, match parcel requests with travel plans, and coordinate handoffs.</li>
          <li>Process delivery payments, refunds, traveler payouts, and payment support.</li>
          <li>Send transactional notifications about OTPs, requests, matches, payments, handoffs, and support.</li>
          <li>Verify identity, prevent fraud, investigate abuse, and protect users and parcels.</li>
          <li>Operate chat, file storage, customer support, ratings, reports, and dispute handling.</li>
          <li>Diagnose crashes, maintain reliability, measure service performance, and improve the product.</li>
          <li>Meet legal, accounting, tax, regulatory, and law-enforcement obligations.</li>
        </LegalList>
        <p>We do not use deleted-account information for marketing, personalization, or product recommendations during the retention window.</p>
      </LegalSection>

      <LegalSection id="sharing" title="4. How we share information">
        <p>We share information only as needed to provide the service, protect users, or meet legal obligations. Depending on the feature, recipients may include:</p>
        <LegalList>
          <li>Other Trickle users involved in the same parcel, travel plan, match, or conversation. We show only information needed for coordination and safety.</li>
          <li>Service providers for hosting, databases, file storage, email, SMS, push notifications, maps and address search, analytics or crash reporting, and customer support.</li>
          <li>Razorpay or another approved payment provider for physical delivery payments, refunds, and traveler payouts.</li>
          <li>Professional advisers, insurers, authorities, or law enforcement when necessary for a dispute, safety incident, fraud investigation, legal claim, or legal obligation.</li>
          <li>A successor entity if Trickle is involved in a merger, acquisition, financing, or asset transfer, subject to appropriate confidentiality protections.</li>
        </LegalList>
        <p>We do not sell personal information. We do not share personal information for third-party advertising tracking unless we first update this policy and obtain any consent required by law.</p>
      </LegalSection>

      <LegalSection id="consent" title="5. Consent and lawful processing">
        <p>We collect and use information on the legal basis that applies to the activity: performance of the service you request, your consent where a permission or optional feature requires it, our legitimate interests in security and service reliability, and legal obligations. We request consent before accessing device location, photos, camera, notifications, or other permission-controlled data where required by the platform or law.</p>
        <p>Some information is necessary to create an account, authenticate you, match a parcel, process a requested payment, investigate a safety report, or comply with law. If you do not provide required information, the relevant feature may not work. Optional information can be withheld without preventing unrelated features from working.</p>
        <p>We do not use a general acceptance of this policy as consent for unrelated purposes. Where sensitive identity-verification information is processed, we will provide the applicable provider notice and request the additional consent or authorization required for that verification flow.</p>
      </LegalSection>

      <LegalSection id="storage" title="6. What we store and who can access it">
        <p>Trickle stores account and operational records in its backend systems, including profile information, authentication and device-session records, parcel and travel records, messages and attachments, support and safety records, payment status, provider transaction identifiers, and audit events. Raw card credentials are not intended to be stored by Trickle and are handled by the approved payment provider.</p>
        <p>Access is role-based and limited to the user, the other participants who need information for the relevant delivery or travel interaction, authorized Trickle support and safety personnel, approved service providers acting on our instructions, and authorities or advisers where legally permitted or required. Staff access should be logged, limited to business need, and removed when no longer required.</p>
        <p>We do not sell personal information. We do not provide personal information to third parties for advertising tracking. Providers may process information only to deliver the contracted service and under their own applicable terms and privacy notices.</p>
      </LegalSection>

      <LegalSection id="security" title="7. Security and encryption">
        <p>Production network traffic is intended to use HTTPS/TLS. Authentication tokens and device-bound sessions are protected with server-side access controls, and active sessions can be revoked. Stored information should be protected with provider encryption at rest, least-privilege access, secret management, backups with controlled access, vulnerability management, and audit logging appropriate to the risk.</p>
        <p>Security is a shared responsibility. Keep your device updated, use a screen lock, do not share OTPs or passwords, and report suspicious activity promptly. No online service or transmission method can be guaranteed completely secure.</p>
      </LegalSection>

      <LegalSection id="retention" title="8. Retention and deletion">
        <p>When you request account deletion, we immediately deactivate the account, revoke active sessions and notification tokens, anonymize direct profile identifiers, and purge user-owned profile files where possible.</p>
        <p>Operational records for payments, disputes, fraud and safety, tax and payouts, parcel requests and matches, travel plans, and chat are targeted for deletion or irreversible anonymization within 30 days after account deletion. The retention schedule is described in this section.</p>
        <p>Records under an active legal hold, dispute, fraud or safety investigation, or a longer legal or regulatory requirement may be retained for longer. We restrict those records to the relevant purpose and remove them when the hold or requirement ends.</p>
      </LegalSection>

      <LegalSection id="rights" title="9. Your choices, withdrawal, and rights">
        <LegalList>
          <li>Access or update information through Account Settings where the feature is available.</li>
          <li>Request account deletion from Account Settings or Support.</li>
          <li>Manage notification permission in the app and your device settings.</li>
          <li>Deny camera, photo, or location permissions and use an available manual fallback.</li>
          <li>Withdraw permission for optional device features through the app or device settings. Withdrawal does not affect processing already completed lawfully, and a feature may stop working afterward.</li>
          <li>Withdraw optional marketing or notification preferences where those controls are available. Transactional messages may still be sent when necessary for account security, delivery, payments, or support.</li>
          <li>Contact us to ask about access, correction, deletion, restriction, objection, or a copy of your information, subject to applicable law.</li>
          <li>Report a user, parcel, message, safety concern, or privacy issue through Support.</li>
        </LegalList>
        <p>We may need to verify your identity before fulfilling a request. Some information may be retained or withheld where required to prevent fraud, protect another person, resolve a dispute, or comply with law.</p>
      </LegalSection>

      <LegalSection id="incidents" title="10. Data breaches and security incidents">
        <p>We maintain an incident process for suspected unauthorized access, disclosure, loss, alteration, or destruction of personal information. The process includes containment, access preservation, technical investigation, risk assessment, remediation, and documentation. We will notify affected users, regulators, or other parties when required by applicable law and within the required timeframe, and will provide practical steps where appropriate.</p>
        <p>Report a suspected breach, account takeover, exposed personal information, or unsafe data disclosure to <a className="font-semibold text-[#e85b43] underline" href="mailto:support@trickle.org.in">support@trickle.org.in</a>. Do not include passwords, OTPs, full payment credentials, or identity-document numbers in email.</p>
      </LegalSection>

      <LegalSection id="transfers" title="11. Security and international processing">
        <p>We use access controls, authentication, encryption in transit, session revocation, provider safeguards, and operational monitoring appropriate to the information we process. No internet service can guarantee absolute security, so please protect your device and never share an OTP.</p>
        <p>Trickle and its providers may process information in countries other than where you live. We use contractual, technical, or other safeguards required by applicable law for those transfers.</p>
      </LegalSection>

      <LegalSection id="children" title="12. Children">
        <p>Trickle is intended for adults and is not directed to children. We do not knowingly collect personal information from children. Contact us if you believe a child has provided information so we can investigate and remove it where appropriate.</p>
      </LegalSection>

      <LegalSection id="changes" title="13. Changes to this policy">
        <p>We may update this policy when our services, providers, or legal obligations change. We will update the date above and provide additional notice for material changes where required.</p>
      </LegalSection>

      <LegalSection id="contact" title="14. Contact us">
        <p>For privacy questions, rights requests, or account-deletion support, email <a className="font-semibold text-[#e85b43] underline" href="mailto:support@trickle.org.in">support@trickle.org.in</a>. Please include enough information for us to identify your account without sending an OTP or password.</p>
      </LegalSection>
    </LegalPage>
  );
}
