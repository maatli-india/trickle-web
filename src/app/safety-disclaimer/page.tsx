import type { Metadata } from "next";
import { LegalList, LegalPage, LegalSection } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Safety Disclaimer | Trickle",
  description: "Important guidance for coordinating a safe parcel handoff on Trickle.",
};

export default function SafetyDisclaimerPage() {
  return (
    <LegalPage
      eyebrow="Trickle safety"
      title="Safety Disclaimer"
      updated="5 August 2026"
      intro="Trickle helps users discover and coordinate peer-to-peer delivery. It does not replace your judgment, carrier rules, customs requirements, or emergency services."
      sections={[
        { href: "#before", label: "Before accepting" },
        { href: "#checks", label: "Parcel checks" },
        { href: "#meetings", label: "Safe meetings" },
        { href: "#risk", label: "Travel risk" },
        { href: "#payments", label: "Payments" },
        { href: "#emergencies", label: "Emergencies" },
        { href: "#limits", label: "Limits" },
      ]}
    >
      <LegalSection id="before" title="1. Before accepting">
        <p>Review the other user&apos;s profile, trip, route, timing, parcel description, and offer. Ask questions using the supported in-app communication flow. Decline anything unclear, unsafe, illegal, undisclosed, or inconsistent with carrier rules.</p>
      </LegalSection>

      <LegalSection id="checks" title="2. Parcel checks">
        <p>The sender is responsible for lawful contents and an accurate declaration. The traveler may refuse, inspect as legally permitted, or report a parcel that appears unsafe, prohibited, damaged, or materially different from its description. Do not accept a sealed package on someone else&apos;s assurances alone.</p>
      </LegalSection>

      <LegalSection id="meetings" title="3. Safe meetings">
        <p>Use well-lit public places, tell someone you trust where you are going, and avoid sharing unnecessary personal details. Do not meet alone in a location that makes you uncomfortable, and do not hand over a parcel or money until the relevant person and request are verified.</p>
      </LegalSection>

      <LegalSection id="risk" title="4. Travel and delivery risk">
        <p>Schedules can change, and delivery may be delayed by weather, transport disruption, illness, customs, security checks, or events outside Trickle&apos;s control. Follow airline, railway, road, customs, and destination rules at all times.</p>
      </LegalSection>

      <LegalSection id="payments" title="5. Payments and fraud">
        <LegalList>
          <li>Use only the in-app or approved provider payment flow.</li>
          <li>Trickle will never ask for an OTP, password, or full card number in chat.</li>
          <li>Stop and report requests for gift cards, cash transfers, remote device access, or credentials.</li>
        </LegalList>
      </LegalSection>

      <LegalSection id="emergencies" title="6. Emergencies and incidents">
        <p>For immediate danger, contact local emergency services first. Then contact Trickle Support with the relevant details. Preserve receipts, packaging, timestamps, and messages when reporting loss, damage, fraud, or a safety incident.</p>
      </LegalSection>

      <LegalSection id="limits" title="7. Limits of the service">
        <p>Trickle does not guarantee identity, parcel condition, legal compliance, transport availability, or delivery outcome beyond the verification and payment controls expressly provided. Users remain responsible for their decisions and should obtain their own insurance or professional advice where appropriate.</p>
        <p>For safety questions, email <a className="font-semibold text-[#e85b43] underline" href="mailto:support@trickle.org.in">support@trickle.org.in</a>.</p>
      </LegalSection>
    </LegalPage>
  );
}
