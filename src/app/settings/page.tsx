"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Ban,
  ChevronRight,
  CreditCard,
  Eye,
  FileText,
  Gift,
  Info,
  LifeBuoy,
  Lock,
  MapPin,
  ShieldCheck,
  Star,
  Trash2,
  UserCog,
} from "lucide-react";
import { AccountPage } from "@/components/account/account-page";
import { apiRequest } from "@/services/api-client";

type Tint = { bg: string; fg: string };
const TINT: Record<string, Tint> = {
  green: { bg: "#e5f0eb", fg: "#285c59" },
  coral: { bg: "#fff0eb", fg: "#b33e2c" },
  violet: { bg: "#eeedfe", fg: "#3c3489" },
  teal: { bg: "#e1f5ee", fg: "#085041" },
  gold: { bg: "#faeeda", fg: "#7a5310" },
  blue: { bg: "#e6f1fb", fg: "#0c447c" },
  pink: { bg: "#fbeaf0", fg: "#72243e" },
};

function Toggle({ checked, onChange }: { checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-10 shrink-0 rounded-full transition ${checked ? "bg-[#183b3a]" : "bg-[#ded8ce]"}`}
    >
      <span className={`absolute top-0.5 size-5 rounded-full bg-white transition ${checked ? "left-[18px]" : "left-0.5"}`} />
    </button>
  );
}

function SettingCard({
  icon: Icon,
  tint,
  label,
  sub,
  trailing,
  danger,
  href,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  tint: Tint;
  label: string;
  sub?: string;
  trailing?: React.ReactNode;
  danger?: boolean;
  href?: string;
}) {
  const accent = danger ? TINT.coral : tint;
  const clickable = Boolean(href);

  const body = (
    <>
      <span
        className="absolute inset-x-6 top-0 h-[3px] scale-x-0 rounded-full transition-transform duration-200 group-hover:scale-x-100"
        style={{ backgroundColor: accent.fg }}
      />
      <div className="flex items-start justify-between gap-3">
        <span
          className="grid size-12 shrink-0 place-items-center rounded-2xl transition-transform duration-200 group-hover:scale-105"
          style={{ backgroundColor: accent.bg, color: accent.fg }}
        >
          <Icon size={20} />
        </span>
        {trailing ??
          (clickable && (
            <span className="mt-1.5 grid size-8 shrink-0 place-items-center rounded-full text-[#c7cedb] transition-colors duration-200 group-hover:bg-[#f6f2eb] group-hover:text-[#183b3a]">
              <ChevronRight size={16} />
            </span>
          ))}
      </div>
      <div className="mt-5">
        <p className={`text-base font-semibold tracking-[-0.01em] ${danger ? "text-[#b33e2c]" : "text-[#183b3a]"}`}>{label}</p>
        {sub && <p className="mt-1.5 text-sm leading-5 text-[#8a8579]">{sub}</p>}
      </div>
    </>
  );

  const className = `group relative flex h-full flex-col overflow-hidden rounded-2xl border p-5 transition-all duration-200 ${
    danger
      ? "border-[#f2cabd] bg-[#fff9f6] hover:-translate-y-0.5 hover:border-[#e85b43] hover:shadow-[0_16px_28px_-16px_rgba(184,66,44,0.35)]"
      : clickable
        ? "border-[#e4ded2] bg-white hover:-translate-y-0.5 hover:border-[#18393866] hover:shadow-[0_16px_28px_-16px_rgba(24,59,58,0.25)]"
        : "border-[#e4ded2] bg-white"
  }`;

  return href ? (
    <Link href={href} className={className}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}

function Group({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="mb-12 last:mb-0">
      <div className="mb-5 flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
        <h2 className="text-xl font-semibold tracking-[-0.02em] text-[#183b3a] sm:text-2xl">{title}</h2>
        {description && <p className="text-sm text-[#a7a297] sm:max-w-xs sm:text-right">{description}</p>}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </div>
  );
}

export default function SettingsPage() {
  const [visible, setVisible] = useState(true);
  const [verified, setVerified] = useState<boolean | null>(null);

  useEffect(() => {
    apiRequest<{ verified?: boolean }>("/v1/users/me")
      .then((response) => setVerified(Boolean(response?.verified)))
      .catch(() => setVerified(null));
  }, []);

  return (
    <AccountPage title="Settings" description="Everything you can manage for your Trickle account, from payments and safety to support and legal.">
      <Group title="Account" description="Your profile, payments, and addresses">
        <SettingCard icon={UserCog} tint={TINT.violet} label="Edit profile" sub="Name, contact details, and notifications" href="/account/settings" />
        <SettingCard icon={CreditCard} tint={TINT.green} label="Payments & payouts" sub="View charges, refunds, and payouts" href="/account/payments" />
        <SettingCard icon={MapPin} tint={TINT.coral} label="Saved addresses" sub="Home, work, and other frequent locations" href="/account/saved-places" />
        <SettingCard
          icon={Eye}
          tint={TINT.violet}
          label="Visible to nearby travelers"
          sub="Let others find your delivery requests"
          trailing={<Toggle checked={visible} onChange={setVisible} />}
        />
      </Group>

      <Group title="Trust & safety" description="How others see and interact with you">
        <SettingCard
          icon={ShieldCheck}
          tint={TINT.teal}
          label="Identity verification"
          sub={verified === null ? "Checking your status" : verified ? "Your identity is confirmed" : "Verify to unlock full access"}
          trailing={
            <span
              className={`mt-1 shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                verified ? "bg-[#e1f5ee] text-[#085041]" : "bg-[#faeeda] text-[#7a5310]"
              }`}
            >
              {verified === null ? "..." : verified ? "Verified" : "Not verified"}
            </span>
          }
        />
        <SettingCard icon={Star} tint={TINT.gold} label="Reliability score" sub="How senders and travelers see you" href="/account/reliability" />
        <SettingCard icon={Ban} tint={TINT.coral} label="Blocked users" sub="Manage people you've blocked" href="/account/blocked-users" />
      </Group>

      <Group title="Support" description="Get help when something goes wrong">
        <SettingCard icon={LifeBuoy} tint={TINT.blue} label="Help & support" sub="Browse guides or contact our team" href="/support" />
        <SettingCard icon={AlertTriangle} tint={TINT.gold} label="Report a problem" sub="Flag an issue with a trip or request" href="/account/report-problem" />
      </Group>

      <Group title="More" description="Grow the community and learn more">
        <SettingCard icon={Gift} tint={TINT.pink} label="Refer a friend" sub="Earn ₹100 per friend" href="/account/refer-a-friend" />
        <SettingCard icon={Info} tint={TINT.violet} label="About app" sub="Our story and how Trickle works" href="/about" />
      </Group>

      <div className="mb-12">
        <h2 className="mb-5 text-xl font-semibold tracking-[-0.02em] text-[#183b3a] sm:text-2xl">Legal</h2>
        <div className="overflow-hidden rounded-2xl border border-[#e4ded2] bg-white">
          {[
            { icon: Lock, label: "Privacy policy", href: "/privacy" },
            { icon: FileText, label: "Terms of service", href: "/terms" },
            { icon: FileText, label: "Community guidelines", href: "/community-guidelines" },
            { icon: ShieldCheck, label: "Safety disclaimer", href: "/safety-disclaimer" },
            { icon: FileText, label: "Data retention", href: "/data-retention" },
          ].map(({ icon: Icon, label, href }) => (
            <Link
              key={href}
              href={href}
              className="group flex items-center gap-3 border-b border-[#eee9e1] px-5 py-4 last:border-0 hover:bg-[#fbfaf7]"
            >
              <Icon size={16} className="shrink-0 text-[#8a8579]" />
              <span className="flex-1 text-sm font-medium text-[#183b3a]">{label}</span>
              <ChevronRight size={16} className="shrink-0 text-[#c7cedb] transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-[#183b3a]" />
            </Link>
          ))}
        </div>
      </div>

      <div>
        <h2 className="mb-5 text-xl font-semibold tracking-[-0.02em] text-[#b33e2c] sm:text-2xl">Danger zone</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <SettingCard icon={Trash2} tint={TINT.coral} danger label="Delete account" sub="Permanently remove your account and all associated data" href="/account-deletion" />
        </div>
      </div>
    </AccountPage>
  );
}
