"use client";

import { ReactNode } from "react";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";

export function AccountPage({ eyebrow = "Your Trickle account", title, description, children }: { eyebrow?: string; title: string; description: string; children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-[#f6f2eb] text-[#1b1d1c]">
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-5 pb-32 sm:px-8">
        <section className="border-b border-[#ded8ce] py-12 sm:py-16">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#e85b43]">{eyebrow}</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-semibold leading-tight tracking-[-0.05em] sm:text-6xl">{title}</h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-[#62645f]">{description}</p>
        </section>
        <section className="py-10 sm:py-14">{children}</section>
      </main>
      <SiteFooter />
    </div>
  );
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="border-t-2 border-[#e7b65c] bg-[#fbfaf7] px-6 py-8 sm:px-8">
      <h2 className="text-xl font-semibold text-[#183b3a]">{title}</h2>
      <p className="mt-2 max-w-xl text-sm leading-6 text-[#62645f]">{description}</p>
    </div>
  );
}
