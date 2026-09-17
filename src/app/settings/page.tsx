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

function Row({
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
  const content = (
    <>
      <span className="grid size-9 shrink-0 place-items-center rounded-full" style={{ backgroundColor: danger ? TINT.coral.bg : tint.bg, color: danger ? TINT.coral.fg : tint.fg }}>
        <Icon size={16} />
      </span>
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-semibold ${danger ? "text-[#b33e2c]" : "text-[#183b3a]"}`}>{label}</p>
        {sub && <p className="mt-0.5 text-xs text-[#a7a297]">{sub}</p>}
      </div>
      {trailing || (href && <ChevronRight size={16} className="shrink-0 text-[#c7cedb]" />)}
    </>
  );
  const className = "flex w-full items-center gap-3 border-b border-[#eee9e1] px-4 py-4 text-left last:border-0 hover:bg-[#fbfaf7]";
  return href ? <Link href={href} className={className}>{content}</Link> : <div className={className}>{content}</div>;
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-7">
      <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#a7a297]">{title}</p>
      <div className="overflow-hidden rounded-2xl border border-[#ded8ce] bg-white">{children}</div>
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
      <div className="max-w-2xl">
        <Group title="Account">
          <Row icon={UserCog} tint={TINT.violet} label="Edit profile" sub="Name, contact details, and notifications" href="/account/settings" />
          <Row icon={CreditCard} tint={TINT.green} label="Payments & payouts" sub="View charges, refunds, and payouts" href="/account/payments" />
          <Row icon={MapPin} tint={TINT.coral} label="Saved addresses" sub="Home, work, and other frequent locations" href="/account/saved-places" />
          <Row icon={Eye} tint={TINT.violet} label="Visible to nearby travelers" sub="Let others find your delivery requests" trailing={<Toggle checked={visible} onChange={setVisible} />} />
        </Group>

        <Group title="Trust & safety">
          <Row icon={ShieldCheck} tint={TINT.teal} label="Identity verification" trailing={<span className={`rounded-full px-3 py-1 text-xs font-semibold ${verified ? "bg-[#e1f5ee] text-[#085041]" : "bg-[#faeeda] text-[#7a5310]"}`}>{verified === null ? "..." : verified ? "Verified" : "Not verified"}</span>} />
          <Row icon={Star} tint={TINT.gold} label="Reliability score" sub="How senders and travelers see you" href="/account/reliability" />
          <Row icon={Ban} tint={TINT.coral} label="Blocked users" sub="Manage people you've blocked" href="/account/blocked-users" />
        </Group>

        <Group title="Support">
          <Row icon={LifeBuoy} tint={TINT.blue} label="Help & support" href="/support" />
          <Row icon={AlertTriangle} tint={TINT.gold} label="Report a problem" href="/account/report-problem" />
        </Group>

        <Group title="More">
          <Row icon={Gift} tint={TINT.pink} label="Refer a friend" sub="Earn ₹100 per friend" href="/account/refer-a-friend" />
          <Row icon={Info} tint={TINT.violet} label="About app" href="/about" />
        </Group>

        <Group title="Legal">
          <Row icon={Lock} tint={TINT.blue} label="Privacy policy" href="/privacy" />
          <Row icon={FileText} tint={TINT.blue} label="Terms of service" href="/terms" />
          <Row icon={FileText} tint={TINT.blue} label="Community guidelines" href="/community-guidelines" />
          <Row icon={ShieldCheck} tint={TINT.blue} label="Safety disclaimer" href="/safety-disclaimer" />
          <Row icon={FileText} tint={TINT.blue} label="Data retention" href="/data-retention" />
          <Row icon={Trash2} tint={TINT.coral} danger label="Delete account" href="/account-deletion" />
        </Group>
      </div>
    </AccountPage>
  );
}
