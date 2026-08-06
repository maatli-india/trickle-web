import { AccountPage } from "@/components/account/account-page";

const sections = [
  { title: "Getting started", questions: [
    ["What is Trickle?", "Trickle connects parcel senders with travellers who are already heading in the right direction. A sender describes the parcel and route; a traveller shares an existing journey and available capacity."],
    ["How do I create an account?", "Enter your Indian mobile number, request an OTP, and verify the six-digit code. New users then add their name, email, gender, and date of birth to complete the profile."],
    ["Can I use Trickle on my phone?", "Yes. The web experience is responsive, and the Trickle mobile app supports the same core account, travel plan, parcel, and match workflows."],
  ]},
  { title: "Sending a parcel", questions: [
    ["How do I find a traveller?", "Choose your pickup date, select pickup and delivery locations from the address suggestions, and search for active travellers near your route. Select a result to review the full travel plan."],
    ["What should I include in parcel notes?", "Describe what the item is, whether it is fragile, any handling instructions, and anything the traveller should know before agreeing to carry it. Do not include passwords or OTPs."],
    ["What happens when I request pickup?", "Trickle sends the request with your route, pickup date, parcel description, and estimated weight. The traveller can review the request and coordinate the handoff details."],
  ]},
  { title: "Sharing a journey", questions: [
    ["How do I post my journey?", "Open Post a trip on Home, add your departure and arrival locations, travel dates, mode, and available parcel capacity, then submit your plan."],
    ["What capacity details can I share?", "You can provide maximum weight, maximum parcel count, accepted parcel types, and preferred pickup or delivery handover options."],
    ["Can I update or cancel a travel plan?", "Use your account travel history to review posted plans. Plan updates and cancellation depend on the current plan status and the permissions available to your account."],
  ]},
  { title: "Safety and support", questions: [
    ["How are pickup details shared?", "Your parcel notes and route details are shared with the traveller when you send a pickup request. Use a clear, public handoff location and confirm the parcel description at pickup."],
    ["What should I do if a plan changes?", "Contact the other participant promptly and keep the agreed route and timing clear. For a serious issue, contact Trickle support with the relevant request, trip, or match reference."],
    ["How can I contact support?", "Email hello@trickle.app with the relevant request, trip, payment, or handoff details. Never send an OTP, password, or other secret credential."],
  ]},
];

export default function FaqsPage() {
  return (
    <AccountPage eyebrow="Help centre" title="Frequently asked questions" description="Quick answers about sending parcels, sharing journeys, and using Trickle.">
      <div className="space-y-10">
        {sections.map((section) => (
          <section key={section.title}>
            <h2 className="mb-4 text-xl font-semibold text-[#183b3a]">{section.title}</h2>
            <div className="space-y-3">
              {section.questions.map(([question, answer]) => (
                <details key={question} className="border-t border-[#ded8ce] bg-[#fbfaf7] px-6 py-5">
                  <summary className="cursor-pointer list-none font-semibold text-[#183b3a]">{question}</summary>
                  <p className="mt-3 max-w-3xl text-sm leading-6 text-[#62645f]">{answer}</p>
                </details>
              ))}
            </div>
          </section>
        ))}
      </div>
    </AccountPage>
  );
}
