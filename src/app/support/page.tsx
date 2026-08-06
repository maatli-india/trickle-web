import { AccountPage } from "@/components/account/account-page";

export default function SupportPage() {
  return <AccountPage title="Support" description="Need help with a request, trip, payment, or handoff? We are here to help."><div className="max-w-2xl border-t-2 border-[#e85b43] bg-[#fbfaf7] p-6 sm:p-8"><h2 className="text-xl font-semibold text-[#183b3a]">Contact Trickle support</h2><p className="mt-3 text-sm leading-6 text-[#62645f]">Share your phone number, the relevant request or trip, and what went wrong so our team can investigate quickly.</p><a href="mailto:support@trickle.app" className="mt-6 inline-block rounded-xl bg-[#183b3a] px-5 py-3 text-sm font-semibold text-white hover:bg-[#285c59]">Email support</a></div></AccountPage>;
}
