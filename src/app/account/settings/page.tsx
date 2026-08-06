"use client";

import { FormEvent, useEffect, useState } from "react";
import { AccountPage } from "@/components/account/account-page";
import { apiRequest } from "@/services/api-client";
import { getWebProfile } from "@/services/auth";

type NotificationPreferences = { pushEnabled?: boolean; emailUpdatesEnabled?: boolean };
type Profile = { name: string; email: string; phone: string; phoneExt: string; gender: string; dob: string; notificationPreferences: NotificationPreferences };

const emptyProfile = (): Profile => ({ name: "", email: "", phone: "", phoneExt: "+91", gender: "", dob: "", notificationPreferences: { pushEnabled: true, emailUpdatesEnabled: true } });

function storedProfile() {
  if (typeof window === "undefined") return emptyProfile();
  try {
    const profile = JSON.parse(getWebProfile() || "{}") as Partial<Profile>;
    return { ...emptyProfile(), ...profile, notificationPreferences: { ...emptyProfile().notificationPreferences, ...profile.notificationPreferences } };
  } catch {
    return emptyProfile();
  }
}

export default function AccountSettingsPage() {
  const [profile, setProfile] = useState(storedProfile);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiRequest<Profile>("/v1/users/me")
      .then((response) => setProfile((current) => ({ ...current, ...response, notificationPreferences: { ...current.notificationPreferences, ...response.notificationPreferences } })))
      .catch(() => setError("We could not load your latest account details. Showing the saved profile instead."))
      .finally(() => setLoading(false));
  }, []);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setMessage(""); setError("");
    try {
      const response = await apiRequest<Profile>("/v1/users/me", { method: "PUT", body: JSON.stringify(profile) });
      const savedProfile = { ...profile, ...response };
      window.localStorage.setItem("trickle.web.profile", JSON.stringify(savedProfile));
      setProfile(savedProfile);
      setMessage("Your account details were saved.");
    } catch {
      setError("Your account details could not be saved. Please try again.");
    }
  };

  return (
    <AccountPage title="Account settings" description="Keep your profile details up to date for parcel handoffs and trip coordination.">
      {loading && <p className="mb-5 text-sm text-[#62645f]">Loading your account details...</p>}
      {error && <p role="alert" className="mb-5 rounded-xl border border-[#e85b43]/30 bg-[#fff0eb] px-4 py-3 text-sm text-[#b33e2c]">{error}</p>}
      <form onSubmit={save} className="max-w-2xl space-y-5 border-t-2 border-[#e85b43] bg-[#fbfaf7] p-6 sm:p-8">
        <label className="block text-sm font-semibold text-[#183b3a]">Name<input required value={profile.name} onChange={(event) => setProfile({ ...profile, name: event.target.value })} className="mt-2 w-full rounded-xl border border-[#d7d2c9] bg-white px-4 py-3 text-sm outline-none focus:border-[#e85b43]" /></label>
        <label className="block text-sm font-semibold text-[#183b3a]">Email<input type="email" value={profile.email} onChange={(event) => setProfile({ ...profile, email: event.target.value })} className="mt-2 w-full rounded-xl border border-[#d7d2c9] bg-white px-4 py-3 text-sm outline-none focus:border-[#e85b43]" /></label>
        <div className="grid gap-5 sm:grid-cols-[0.35fr_1fr]"><label className="block text-sm font-semibold text-[#183b3a]">Code<input value={profile.phoneExt} onChange={(event) => setProfile({ ...profile, phoneExt: event.target.value })} className="mt-2 w-full rounded-xl border border-[#d7d2c9] bg-white px-4 py-3 text-sm outline-none focus:border-[#e85b43]" /></label><label className="block text-sm font-semibold text-[#183b3a]">Phone<input value={profile.phone} onChange={(event) => setProfile({ ...profile, phone: event.target.value })} className="mt-2 w-full rounded-xl border border-[#d7d2c9] bg-white px-4 py-3 text-sm outline-none focus:border-[#e85b43]" /></label></div>
        <div className="grid gap-5 sm:grid-cols-2"><label className="block text-sm font-semibold text-[#183b3a]">Gender<select value={profile.gender} onChange={(event) => setProfile({ ...profile, gender: event.target.value })} className="mt-2 w-full rounded-xl border border-[#d7d2c9] bg-white px-4 py-3 text-sm outline-none focus:border-[#e85b43]"><option value="">Not specified</option><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option></select></label><label className="block text-sm font-semibold text-[#183b3a]">Date of birth<input type="date" value={profile.dob} onChange={(event) => setProfile({ ...profile, dob: event.target.value })} className="mt-2 w-full rounded-xl border border-[#d7d2c9] bg-white px-4 py-3 text-sm outline-none focus:border-[#e85b43]" /></label></div>
        <fieldset className="space-y-3 border-t border-[#ded8ce] pt-5"><legend className="text-sm font-semibold text-[#183b3a]">Notification preferences</legend><label className="flex items-center gap-3 text-sm text-[#62645f]"><input type="checkbox" checked={Boolean(profile.notificationPreferences.pushEnabled)} onChange={(event) => setProfile({ ...profile, notificationPreferences: { ...profile.notificationPreferences, pushEnabled: event.target.checked } })} />Push notifications</label><label className="flex items-center gap-3 text-sm text-[#62645f]"><input type="checkbox" checked={Boolean(profile.notificationPreferences.emailUpdatesEnabled)} onChange={(event) => setProfile({ ...profile, notificationPreferences: { ...profile.notificationPreferences, emailUpdatesEnabled: event.target.checked } })} />Email updates</label></fieldset>
        <button className="rounded-xl bg-[#183b3a] px-5 py-3 text-sm font-semibold text-white hover:bg-[#285c59]">Save changes</button>
        {message && <p role="status" className="text-sm text-[#285c59]">{message}</p>}
      </form>
    </AccountPage>
  );
}
