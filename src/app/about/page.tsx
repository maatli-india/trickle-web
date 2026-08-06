import { AccountPage } from "@/components/account/account-page";

export default function AboutPage() {
  return <AccountPage eyebrow="About Trickle" title="Delivery that follows the journey" description="Trickle connects parcel senders with travelers already heading in the right direction."><div className="max-w-2xl space-y-5 text-base leading-7 text-[#62645f]"><p>Senders can create a delivery request with pickup, destination, parcel, and receiver details. Travelers can share an upcoming route and available capacity.</p><p>Trickle helps both sides coordinate clearly, from the first match through the final handoff.</p></div></AccountPage>;
}
