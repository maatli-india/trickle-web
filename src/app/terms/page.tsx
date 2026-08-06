import type { Metadata } from "next";
import { LegalList, LegalPage, LegalSection } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Terms of Service | Trickle",
  description: "The rules for using Trickle's people-powered parcel delivery service.",
};

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="Trickle terms"
      title="Terms of Service"
      updated="5 August 2026"
      intro="These terms explain how Trickle works, what senders and travelers agree to do, and how payments, handoffs, cancellations, safety reports, and disputes are handled."
      sections={[
        { href: "#overview", label: "Overview" },
        { href: "#roles", label: "Responsibilities" },
        { href: "#parcels", label: "Parcel rules" },
        { href: "#payments", label: "Payments" },
        { href: "#cancellations", label: "Disputes" },
        { href: "#content", label: "Conduct" },
        { href: "#contact", label: "Contact" },
      ]}
    >
      <LegalSection id="overview" title="1. The Trickle service">
        <p>Trickle is a marketplace and coordination platform. We help a sender find a traveler with a compatible route and help both people coordinate a parcel handoff. Unless we expressly say otherwise, Trickle is not the carrier, sender, traveler, insurer, or owner of a parcel.</p>
        <p>By creating an account or using Trickle, you agree to these Terms, our <a className="font-semibold text-[#e85b43] underline" href="/privacy">Privacy Policy</a>, and the rules shown in the app for the relevant parcel, travel plan, match, payment, or dispute.</p>
      </LegalSection>

      <LegalSection id="eligibility" title="2. Eligibility and accounts">
        <LegalList>
          <li>You must be legally able to enter into these Terms and meet any age requirement shown in your country.</li>
          <li>You must provide accurate, current information and keep your phone number and profile details up to date.</li>
          <li>You are responsible for your device, OTPs, account activity, and keeping access credentials private.</li>
          <li>You must not create duplicate, deceptive, impersonating, or automated accounts.</li>
          <li>You must tell us promptly if you suspect unauthorized access or a safety issue.</li>
        </LegalList>
      </LegalSection>

      <LegalSection id="roles" title="3. Sender and traveler responsibilities">
        <p><strong>Senders must:</strong></p>
        <LegalList>
          <li>Describe the parcel accurately, including its contents, size, weight, value, and any handling needs.</li>
          <li>Package the parcel safely and provide correct pickup and delivery information.</li>
          <li>Not use a parcel to move prohibited, dangerous, illegal, stolen, or undeclared goods.</li>
          <li>Attend the agreed handoff or arrange an approved alternative in advance.</li>
        </LegalList>
        <p><strong>Travelers must:</strong></p>
        <LegalList>
          <li>Post accurate route, date, timing, identity, and available-space information.</li>
          <li>Inspect the parcel enough to identify obvious safety or policy concerns before accepting it.</li>
          <li>Keep an accepted parcel secure and complete the agreed handoffs.</li>
          <li>Notify the sender and Trickle promptly about delays, cancellation, loss, damage, or safety concerns.</li>
        </LegalList>
        <p>Neither party may pressure, threaten, harass, discriminate against, or bypass Trickle’s safety and payment controls.</p>
      </LegalSection>

      <LegalSection id="parcels" title="4. Parcel rules">
        <p>Parcels must comply with applicable law and any route, carrier, airport, railway, venue, or local restrictions. Prohibited or restricted items include, without limitation:</p>
        <LegalList>
          <li>Weapons, explosives, ammunition, illegal drugs, controlled substances, and stolen goods.</li>
          <li>Hazardous, flammable, radioactive, biological, toxic, or unsafe materials.</li>
          <li>Cash, negotiable instruments, payment cards, financial credentials, and sensitive documents unless expressly approved.</li>
          <li>Live animals, perishable goods, and temperature-sensitive goods unless expressly supported.</li>
          <li>Counterfeit goods, unlicensed goods, regulated goods, or anything intended to evade customs or law enforcement.</li>
          <li>Any item whose contents, value, weight, or dimensions are deliberately misrepresented.</li>
        </LegalList>
        <p>We may refuse, cancel, hold, report, or remove a parcel or match when we believe it violates these Terms, creates a safety risk, or may expose users or Trickle to legal or financial harm.</p>
      </LegalSection>

      <LegalSection id="identity" title="5. Identity and safety">
        <p>We may request identity or profile verification to protect users and improve trust. Verification does not guarantee a user’s conduct, parcel contents, or delivery outcome.</p>
        <p>Use public or otherwise appropriate handoff locations where possible. Do not share OTPs, passwords, unnecessary financial information, or sensitive identity documents in chat. Report emergencies to local emergency services first and then contact Trickle Support.</p>
      </LegalSection>

      <LegalSection id="payments" title="6. Payments, refunds, and payouts">
        <p>Trickle may use Razorpay or another payment provider for physical delivery payments, refunds, and traveler payouts. The total amount, payment status, and any applicable fee are shown before confirmation.</p>
        <LegalList>
          <li>Payment may be authorized or held until the relevant confirmation and handoff conditions are met.</li>
          <li>Traveler payout is separate from sender payment and may be delayed for verification, dispute, fraud, or safety review.</li>
          <li>Payment failures, abandoned checkouts, duplicate payments, and webhook delays may require retry or support review.</li>
          <li>Refunds follow the cancellation, delivery, and dispute rules shown in the app and may take time to appear through the original payment method.</li>
          <li>Trickle does not operate an app wallet or stored-value balance.</li>
        </LegalList>
        <p>You authorize us and our payment provider to process the transaction you confirm. Do not send payment directly to another user unless the app explicitly instructs you to do so.</p>
      </LegalSection>

      <LegalSection id="cancellations" title="7. Cancellations, delivery issues, and disputes">
        <p>Cancellation outcomes depend on the state of the request or match, who cancels, timing, payment status, and the facts available to Support. A cancellation may result in no charge, a full or partial refund, a delayed payout, or a manual review.</p>
        <p>For loss, damage, delay, no-show, suspected fraud, or a disagreement, preserve relevant evidence and contact Support promptly. We may request photos, timestamps, handoff details, chat history, payment information, or identity verification.</p>
        <p>We may place funds, accounts, matches, or payouts on hold while investigating. Decisions may consider these Terms, the app record, user reports, provider information, and applicable law.</p>
      </LegalSection>

      <LegalSection id="content" title="8. User content and conduct">
        <p>You keep ownership of content you submit, but grant Trickle a limited license to host, process, display, and share it as needed to operate the service, coordinate delivery, investigate reports, provide support, and comply with law.</p>
        <LegalList>
          <li>Do not upload content that is illegal, abusive, threatening, deceptive, discriminatory, infringing, or invasive of another person’s privacy.</li>
          <li>Do not spam, scrape, reverse engineer, probe, overload, or interfere with the service.</li>
          <li>Do not use Trickle to move prohibited goods or bypass payment, verification, moderation, or account restrictions.</li>
          <li>Do not share another person’s personal information without a lawful reason and permission.</li>
        </LegalList>
        <p>We may remove content, limit visibility, suspend an account, cancel a match, or report conduct to authorities when necessary for safety, policy enforcement, or legal compliance.</p>
      </LegalSection>

      <LegalSection id="reports" title="9. Reports, blocking, and moderation">
        <p>Use in-app support or reporting tools for abusive users, unsafe parcels, suspicious activity, or harmful messages. We may review relevant content and account information to investigate. We may not disclose investigation details where doing so would compromise safety, privacy, or legal obligations.</p>
        <p>Blocking or moderation may limit contact, but it cannot guarantee that a person will never encounter another person offline. Contact local emergency services for immediate danger.</p>
      </LegalSection>

      <LegalSection id="availability" title="10. Availability and third parties">
        <p>We work to keep Trickle available and accurate, but routes, users, networks, maps, payment providers, storage providers, and notification systems can fail or change. We may modify, suspend, or discontinue features with reasonable notice where practical.</p>
        <p>Third-party services have their own terms and policies. Trickle is not responsible for a third party’s independent service, content, availability, or handling of information beyond our control.</p>
      </LegalSection>

      <LegalSection id="liability" title="11. Responsibility and limits">
        <p>To the extent permitted by law, you use Trickle at your own risk and remain responsible for your decisions, parcel contents, conduct, and compliance with law. Trickle does not guarantee that a match will be available, a user will perform, a parcel will arrive on time, or a parcel will be undamaged.</p>
        <p>Nothing in these Terms excludes or limits liability that cannot legally be excluded, including liability for fraud, willful misconduct, or rights that consumers cannot waive under applicable law.</p>
      </LegalSection>

      <LegalSection id="termination" title="12. Suspension and termination">
        <p>You may stop using Trickle and request account deletion at any time through Account Settings or Support. We may suspend or terminate access for violations, fraud, safety risks, non-payment, legal requirements, or conduct that harms users or the service.</p>
        <p>Account deletion deactivates the account and follows the retention schedule in the Privacy Policy. Payment, dispute, safety, fraud, tax, parcel, travel, and chat records may be retained for up to 30 days, or longer where a legal hold or legal requirement applies.</p>
      </LegalSection>

      <LegalSection id="changes" title="13. Changes to these Terms">
        <p>We may update these Terms as the service or legal requirements change. We will update the date above and provide additional notice for material changes where required. Continued use after the effective date means the updated Terms apply to future use.</p>
      </LegalSection>

      <LegalSection id="contact" title="14. Contact and complaints">
        <p>For questions, complaints, account deletion, safety concerns, or disputes, contact <a className="font-semibold text-[#e85b43] underline" href="mailto:hello@trickle.app">hello@trickle.app</a>. Include the relevant request, match, or payment reference, but never include an OTP or password.</p>
      </LegalSection>
    </LegalPage>
  );
}
