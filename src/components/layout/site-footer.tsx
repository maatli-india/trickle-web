import Link from "next/link";
import { Mail, Smartphone } from "lucide-react";

type FooterLink = { label: string; href: string };

const footerColumns: { title: string; links: FooterLink[] }[] = [
  {
    title: "Product",
    links: [
      { label: "How it works", href: "/#how-it-works" },
      { label: "Send a parcel", href: "/#send" },
      { label: "Post a trip", href: "/#travel" },
      { label: "FAQs", href: "/faqs" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About us", href: "/about" },
      { label: "Blog", href: "/blog" },
      { label: "Support", href: "/support" },
      { label: "Contact us", href: "mailto:support@trickle.org.in" },
    ],
  },
  {
    title: "Trust & safety",
    links: [
      { label: "Safety disclaimer", href: "/safety-disclaimer" },
      { label: "Community guidelines", href: "/community-guidelines" },
      { label: "Data retention", href: "/data-retention" },
      { label: "Delete your account", href: "/account-deletion" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy policy", href: "/privacy" },
      { label: "Terms of service", href: "/terms" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-[#ded8ce] bg-[#fbfaf7] text-[#62645f]">
      <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-16">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_1fr_1fr]">
          <div className="max-w-xs">
            <Link href="/" className="flex items-center gap-2.5" aria-label="Trickle home">
              <span className="grid size-9 place-items-center rounded-xl bg-[#e85b43] text-lg font-bold text-white">T</span>
              <span className="text-xl font-semibold tracking-[-0.03em] text-[#1b1d1c]">trickle</span>
            </Link>
            <p className="mt-4 text-sm leading-6">
              People-powered parcel delivery that follows the journey — matched with someone already going your way.
            </p>
            <div className="mt-5 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-[#a7a297]">
              <Smartphone size={14} />
              <span>iOS &amp; Android app — coming soon</span>
            </div>
            <a href="mailto:support@trickle.org.in" className="mt-3 flex items-center gap-2 text-sm font-semibold text-[#183b3a] transition hover:text-[#e85b43]">
              <Mail size={14} />
              support@trickle.org.in
            </a>
          </div>

          {footerColumns.map((column) => (
            <nav key={column.title} aria-label={column.title}>
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#a7a297]">{column.title}</p>
              <ul className="mt-4 space-y-3 text-sm">
                {column.links.map((link) => (
                  <li key={link.label}>
                    {link.href.startsWith("mailto:") ? (
                      <a href={link.href} className="transition hover:text-[#e85b43]">{link.label}</a>
                    ) : (
                      <Link href={link.href} className="transition hover:text-[#e85b43]">{link.label}</Link>
                    )}
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-[#ded8ce] pt-6 text-xs text-[#77766f] sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Maatli Tech Private Limited. All rights reserved. Trickle is a product of <span className="font-semibold text-[#183b3a]">Maatli Tech Private Limited</span>.</p>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            <Link href="/privacy" className="transition hover:text-[#e85b43]">Privacy</Link>
            <Link href="/terms" className="transition hover:text-[#e85b43]">Terms</Link>
            <Link href="/safety-disclaimer" className="transition hover:text-[#e85b43]">Safety</Link>
            <Link href="/community-guidelines" className="transition hover:text-[#e85b43]">Community guidelines</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
