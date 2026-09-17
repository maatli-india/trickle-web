import type { Metadata } from "next";
import { LegalList, LegalPage, LegalSection } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Community Guidelines | Trickle",
  description: "How senders and travelers are expected to treat one another on Trickle.",
};

export default function CommunityGuidelinesPage() {
  return (
    <LegalPage
      eyebrow="Trickle community"
      title="Community Guidelines"
      updated="5 August 2026"
      intro="Trickle works when people communicate honestly and treat one another with care. These guidelines apply to profiles, trips, parcel requests, photos, messages, payments, and offline handoffs arranged through the service."
      sections={[
        { href: "#honest", label: "Be honest" },
        { href: "#boundaries", label: "Respect boundaries" },
        { href: "#lawful", label: "Keep content lawful" },
        { href: "#transaction", label: "Protect the transaction" },
        { href: "#report", label: "Report problems" },
        { href: "#enforcement", label: "Enforcement" },
        { href: "#contact", label: "Contact" },
      ]}
    >
      <LegalSection id="honest" title="1. Be honest">
        <p>Use your real identity, keep trip and delivery information current, and describe parcels accurately. Do not manipulate ratings, availability, offers, or verification, and do not misrepresent whether a delivery was completed.</p>
      </LegalSection>

      <LegalSection id="boundaries" title="2. Respect boundaries">
        <p>Do not threaten, harass, stalk, discriminate against, sexually harass, exploit, or pressure another person. Do not request unnecessary personal information, and do not move a conversation outside the app to avoid safety or payment controls.</p>
      </LegalSection>

      <LegalSection id="lawful" title="3. Keep content lawful">
        <p>Do not upload illegal, hateful, violent, sexually exploitative, infringing, deceptive, or dangerous content. Do not share another person&apos;s private information, identity documents, payment details, or images without permission.</p>
      </LegalSection>

      <LegalSection id="transaction" title="4. Protect the transaction">
        <LegalList>
          <li>Do not create duplicate or fake accounts, or evade a suspension.</li>
          <li>Do not manipulate a counter-offer or request payment outside the supported in-app flow.</li>
          <li>Do not use stolen or unauthorized payment methods.</li>
          <li>Never conceal an item from a traveler or from carrier inspection.</li>
        </LegalList>
      </LegalSection>

      <LegalSection id="report" title="5. Report problems">
        <p>Use Support to report threats, prohibited items, fraud, impersonation, unsafe meetings, discrimination, spam, or privacy violations. Include the relevant request or trip context without uploading unnecessary sensitive information.</p>
      </LegalSection>

      <LegalSection id="enforcement" title="6. Enforcement">
        <p>Trickle may remove content, warn users, restrict communication, cancel requests, hold payments, suspend accounts, or cooperate with lawful requests from authorities. Enforcement considers severity, evidence, repeated behaviour, and immediate safety risk. You can raise an appeal through Support.</p>
      </LegalSection>

      <LegalSection id="contact" title="7. Contact us">
        <p>For questions about these guidelines or to report a concern, email <a className="font-semibold text-[#e85b43] underline" href="mailto:support@trickle.org.in">support@trickle.org.in</a>.</p>
      </LegalSection>
    </LegalPage>
  );
}
