"use client";

import { ReactNode } from "react";
import { Inbox } from "lucide-react";
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

export function EmptyState({
  title,
  description,
  icon: Icon = Inbox,
}: {
  title: string;
  description: string;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
}) {
  return (
    <div className="max-w-2xl overflow-hidden rounded-2xl border border-[#e4ded2] bg-white shadow-[0_20px_40px_-28px_rgba(24,59,58,0.2)]">
      <div className="h-[3px] bg-[#e7b65c]" />
      <div className="flex flex-col items-center px-6 py-14 text-center sm:px-10">
        <span className="grid size-14 place-items-center rounded-2xl bg-[#faeeda] text-[#7a5310]">
          <Icon size={24} />
        </span>
        <h2 className="mt-5 text-xl font-semibold tracking-[-0.01em] text-[#183b3a]">{title}</h2>
        <p className="mt-2 max-w-sm text-sm leading-6 text-[#8a8579]">{description}</p>
      </div>
    </div>
  );
}
