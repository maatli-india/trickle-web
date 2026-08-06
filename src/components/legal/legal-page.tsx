import type { ReactNode } from "react";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";

type LegalPageProps = {
  title: string;
  eyebrow: string;
  updated: string;
  intro: string;
  sections: { href: string; label: string }[];
  children: ReactNode;
};

export function LegalPage({ title, eyebrow, updated, intro, sections, children }: LegalPageProps) {
  return (
    <div className="min-h-screen bg-[#f6f2eb] text-[#1b1d1c]">
      <SiteHeader />

      <main className="mx-auto grid max-w-6xl gap-10 px-5 py-12 sm:px-8 sm:py-16 lg:grid-cols-[190px_1fr] lg:gap-16">
        <aside className="lg:sticky lg:top-8 lg:self-start">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#e85b43]">Legal</p>
          <nav className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm text-[#62645f] lg:block" aria-label="On this page">
            {sections.map((section) => <a key={section.href} className="block py-1 hover:text-[#1b1d1c]" href={section.href}>{section.label}</a>)}
          </nav>
        </aside>

        <article className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#e85b43]">{eyebrow}</p>
          <h1 className="mt-3 text-4xl font-semibold leading-tight tracking-[-0.055em] sm:text-6xl">{title}</h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-[#62645f]">{intro}</p>
          <p className="mt-4 text-sm text-[#77766f]">Last updated: {updated}</p>

          <div className="mt-12 space-y-10 text-[15px] leading-7 text-[#41433f]">{children}</div>
        </article>
      </main>

      <SiteFooter />
    </div>
  );
}

export function LegalSection({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return <section id={id} className="scroll-mt-8"><h2 className="text-2xl font-semibold tracking-[-0.035em] text-[#1b1d1c]">{title}</h2><div className="mt-3 space-y-3">{children}</div></section>;
}

export function LegalList({ children }: { children: ReactNode }) {
  return <ul className="list-disc space-y-2 pl-5">{children}</ul>;
}
