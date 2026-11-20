import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, Camera, FileCheck, Lock, MessageCircleWarning, ShieldCheck } from "lucide-react";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { StoreButtons } from "@/components/layout/store-buttons";
import { MatchPreview } from "@/components/home/match-preview";
import { UseCaseCarousel } from "@/components/home/use-case-carousel";

export const metadata: Metadata = {
  title: "Trickle | Get the app",
  description: "People-powered parcel delivery that follows the journey. Get the Trickle app for Android and iPhone.",
};

// The homepage in showcase mode (src/proxy.ts rewrites "/" here). Everything
// happens in the mobile app; this page explains Trickle and links to the
// stores. Section ids match the web app's homepage so footer anchors work.
export default function DownloadPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#f6f2eb] text-[#1b1d1c]">
      <SiteHeader />

      <main id="top" className="mx-auto flex-1 max-w-7xl px-5 pb-24 sm:px-8">
        <section className="grid gap-10 py-12 sm:py-16 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:py-24">
          <div>
            <p className="mb-5 text-sm font-semibold uppercase tracking-[0.18em] text-[#e85b43]">People-powered delivery</p>
            <h1 className="max-w-3xl text-5xl font-semibold leading-[0.98] tracking-[-0.065em] sm:text-7xl">
              A parcel can travel with someone already going your way.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-[#62645f]">
              Send a parcel with a traveller on your route, or earn on a trip you&apos;re already taking.
              Everything happens in the Trickle app.
            </p>
            <StoreButtons className="mt-8" />
          </div>
          <MatchPreview />
        </section>

        <section className="pb-12 sm:pb-20">
          <UseCaseCarousel />
        </section>

        <section id="how-it-works" className="scroll-mt-8 grid gap-5 pb-12 sm:grid-cols-3 sm:pb-20">
          {[
            ["01", "Match with a route", "See travellers already heading in the right direction."],
            ["02", "Agree together", "Review parcel details and settle on a fair amount."],
            ["03", "Handoff with care", "Use pickup and delivery verification at each handoff."],
          ].map(([number, title, description]) => (
            <article key={number} className="border-t-2 border-[#e7b65c] pt-4">
              <span className="text-xs font-semibold text-[#e85b43]">{number}</span>
              <h3 className="mt-5 text-xl font-semibold tracking-[-0.03em]">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-[#62645f]">{description}</p>
            </article>
          ))}
        </section>

        <div className="grid gap-5 border-t border-[#ded8ce] py-12 sm:py-16 lg:grid-cols-2">
          <section id="send" className="scroll-mt-8 rounded-2xl border border-[#ded8ce] bg-white p-6 sm:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#e85b43]">Sending something?</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] sm:text-3xl">Find a traveller on your route.</h2>
            <p className="mt-3 text-base leading-7 text-[#62645f]">
              Search by where it&apos;s going and when it needs to get there. Add photos or a short video of the
              parcel, send a request, and follow it from pickup to delivery.
            </p>
          </section>
          <section id="travel" className="scroll-mt-8 rounded-2xl border border-[#ded8ce] bg-white p-6 sm:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#e85b43]">Have a journey planned?</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] sm:text-3xl">Turn your spare space into a useful route.</h2>
            <p className="mt-3 text-base leading-7 text-[#62645f]">
              Post your trip, from a one-off journey to a daily commute, with your available space. Choose the
              requests that fit and earn on the way.
            </p>
          </section>
        </div>

        <section className="border-t border-[#ded8ce] py-12 sm:py-16">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#e85b43]">Built for trust</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">Safety controls at every step.</h2>
          </div>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: BadgeCheck, title: "Verified accounts", description: "Every account is verified with phone OTP before it can send a request or post a trip.", href: "/safety-disclaimer" },
              { icon: FileCheck, title: "Pickup & delivery checks", description: "Parcel details are recorded up front and confirmed with a code at pickup and drop-off.", href: "/community-guidelines" },
              { icon: Camera, title: "Handover proof", description: "Travellers can record photos or a short video of the parcel at each handover.", href: "/safety-disclaimer" },
              { icon: Lock, title: "Secure payments", description: "Payments run through an approved payment provider. We never ask for OTPs or card details in chat.", href: "/privacy" },
              { icon: MessageCircleWarning, title: "Report & support", description: "Report a user, parcel, or message any time. Our support team investigates every report.", href: "/support" },
              { icon: ShieldCheck, title: "Clear guidelines", description: "What can and can't be sent, and how both sides should behave, is spelled out up front.", href: "/community-guidelines" },
            ].map((item) => (
              <Link
                key={item.title}
                href={item.href}
                className="flex flex-col gap-4 rounded-2xl border border-[#ded8ce] bg-white p-5 transition hover:-translate-y-0.5 hover:border-[#e85b43] hover:shadow-md"
              >
                <span className="grid size-11 place-items-center rounded-full bg-[#e5f0eb] text-[#285c59]">
                  <item.icon size={20} />
                </span>
                <div>
                  <h3 className="text-base font-semibold text-[#183b3a]">{item.title}</h3>
                  <p className="mt-1.5 text-sm leading-6 text-[#62645f]">{item.description}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="border-t border-[#ded8ce] py-12 sm:py-16">
          <div className="flex flex-col items-start justify-between gap-6 rounded-2xl bg-[#183b3a] px-6 py-10 text-white sm:flex-row sm:items-center sm:px-10">
            <div>
              <h2 className="text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">Ready to move your first parcel?</h2>
              <p className="mt-2 max-w-lg text-sm leading-6 text-[#c5d4ce]">
                Get the app and sign up with your phone number. It takes less than a minute.{" "}
                <Link href="/faqs" className="font-semibold text-white underline decoration-[#e7b65c] decoration-2 underline-offset-4">Read the FAQs</Link>
              </p>
            </div>
            <StoreButtons tone="light" className="shrink-0" />
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
