import type { Metadata } from "next";
import { LegalList, LegalPage, LegalSection } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Cancellation & Refund Policy | Trickle",
  description: "What happens to your refund and reliability score when a trip or request is cancelled on Trickle.",
};

export default function CancellationPolicyPage() {
  return (
    <LegalPage
      eyebrow="Trickle policy"
      title="Cancellation & Refund Policy"
      updated="1 October 2026"
      intro="What happens to your refund and your reliability score depends on who cancels and when. This page covers every case."
      sections={[
        { href: "#free", label: "Free cancellation" },
        { href: "#sender-late", label: "Sender cancels late" },
        { href: "#traveler-late", label: "Traveler cancels late" },
        { href: "#after-pickup", label: "After pickup" },
        { href: "#whole-trip", label: "Cancelling a trip" },
        { href: "#no-show", label: "No-shows" },
        { href: "#major-edits", label: "Major trip edits" },
        { href: "#reliability", label: "Reliability score" },
      ]}
    >
      <LegalSection id="free" title="1. Free cancellation — more than 48 hours before pickup">
        <p>Either side can cancel with no fee and a full refund, any time up to 48 hours before the trip is due to start. Nothing is recorded against a traveler&apos;s reliability score for cancelling this early.</p>
      </LegalSection>

      <LegalSection id="sender-late" title="2. Sender cancels — less than 48 hours before pickup">
        <p>A 25% cancellation fee is deducted from what the sender paid, to compensate the traveler for the capacity they held; the remaining 75% is refunded. This does not affect the traveler&apos;s or the sender&apos;s reliability score — the fee is the consequence.</p>
      </LegalSection>

      <LegalSection id="traveler-late" title="3. Traveler cancels — less than 48 hours before pickup">
        <p>The sender is always refunded in full, with no fee either way — travelers are never charged for cancelling a request. Instead, cancelling this close to pickup is recorded against the traveler&apos;s reliability score.</p>
      </LegalSection>

      <LegalSection id="after-pickup" title="4. After the package has already been picked up">
        <p>Once a traveler has collected a package, backing out is treated as more serious than a standard cancellation and is recorded against their reliability score. If it was a genuine emergency, contact support — our team can review it and exclude a verified emergency from the score.</p>
      </LegalSection>

      <LegalSection id="whole-trip" title="5. Cancelling a whole trip">
        <p>Cancelling a trip cancels every request on it. Each sender is refunded in full, exactly as a traveler-initiated cancellation above. If any of those requests were already confirmed, it also counts more heavily against the traveler&apos;s reliability score than cancelling a single request — scaled by how many senders were affected.</p>
      </LegalSection>

      <LegalSection id="no-show" title="6. Not showing up for pickup">
        <p>If a sender doesn&apos;t show up at the agreed pickup time or place, our support team can record a no-show against the sender&apos;s reliability score once it&apos;s reported.</p>
      </LegalSection>

      <LegalSection id="major-edits" title="7. Changing trip details after requests are confirmed">
        <p>Editing a trip&apos;s route, travel mode, or handover method, shifting its schedule by more than an hour, or reducing capacity below what&apos;s already confirmed counts as a major change. The first one on a trip with confirmed requests is a free pass — repeating it affects the traveler&apos;s reliability score.</p>
      </LegalSection>

      <LegalSection id="reliability" title="8. How this affects your reliability score">
        <p>Your reliability score reflects your recent activity, not your entire history, so it recovers over time as you complete more trips and requests on time. In short:</p>
        <LegalList>
          <li>Completing a trip or request on time raises your score — this is the main way it moves in your favor.</li>
          <li>A late cancellation, an emergency after pickup, a cancelled trip with confirmed requests, a no-show, or a repeated major edit all count against it, in roughly that order of severity.</li>
          <li>A verified genuine emergency (reviewed by support) is excluded from your score entirely.</li>
        </LegalList>
      </LegalSection>
    </LegalPage>
  );
}
