"use client";

import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { AccountPage } from "@/components/account/account-page";
import { Avatar } from "@/components/ui/avatar";
import { apiRequest } from "@/services/api-client";
import { buildDeviceDetails, getWebProfile, getWebUserId } from "@/services/auth";
import { deleteMyProfilePic, uploadProfilePic, waitForAvatarUrl } from "@/services/files";
import { startDigilockerVerification } from "@/services/digilocker";

type NotificationPreferences = { pushEnabled?: boolean; emailUpdatesEnabled?: boolean };
type Profile = { name: string; email: string; phone: string; phoneExt: string; gender: string; dob: string; verified?: boolean; notificationPreferences: NotificationPreferences };

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
  const userId = getWebUserId();
  const [avatarRefreshKey, setAvatarRefreshKey] = useState(0);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoStatus, setPhotoStatus] = useState("");
  const [photoError, setPhotoError] = useState("");
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState("");

  const pickPhoto = () => photoInputRef.current?.click();

  const uploadPhoto = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (photoInputRef.current) photoInputRef.current.value = "";
    if (!file) return;
    setPhotoBusy(true);
    setPhotoError("");
    setPhotoStatus("Uploading your photo...");
    try {
      const status = await uploadProfilePic(file);
      if (status.status !== "READY") throw new Error("Your photo could not be processed. Please try a different image.");
      setPhotoStatus("Finishing up...");
      if (userId) await waitForAvatarUrl(userId);
      setAvatarRefreshKey((key) => key + 1);
    } catch (requestError) {
      setPhotoError(requestError instanceof Error ? requestError.message : "Could not upload your photo.");
    } finally {
      setPhotoBusy(false);
      setPhotoStatus("");
    }
  };

  const removePhoto = async () => {
    setPhotoBusy(true);
    setPhotoError("");
    try {
      await deleteMyProfilePic();
      setAvatarRefreshKey((key) => key + 1);
    } catch (requestError) {
      const status = (requestError as { status?: number })?.status;
      if (status === 404) setAvatarRefreshKey((key) => key + 1);
      else setPhotoError(requestError instanceof Error ? requestError.message : "Could not remove your photo.");
    } finally {
      setPhotoBusy(false);
    }
  };

  // A full-page redirect to DigiLocker's own site (never an embedded
  // iframe — same RFC 8252 "no embedded user-agent" reasoning the mobile
  // app follows with the system browser). The backend's callback 302s back
  // to /account/verify/result?status=...&reason=..., which is its own page
  // below, not handled here.
  const startVerification = async () => {
    setVerifying(true);
    setVerifyError("");
    try {
      const { authorizeUrl } = await startDigilockerVerification();
      if (!authorizeUrl) throw new Error("DigiLocker verification is not available right now.");
      window.location.href = authorizeUrl;
    } catch (requestError) {
      setVerifyError(requestError instanceof Error ? requestError.message : "DigiLocker verification could not be started. Please try again.");
      setVerifying(false);
    }
  };

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
      const response = await apiRequest<Profile>("/v1/users/me", { method: "PUT", body: JSON.stringify({ ...profile, ...buildDeviceDetails() }) });
      const savedProfile = { ...profile, ...response };
      window.localStorage.setItem("trickle.web.profile", JSON.stringify(savedProfile));
      setProfile(savedProfile);
      setMessage("Your account details were saved.");
    } catch {
      setError("Your account details could not be saved. Please try again.");
    }
  };

  const inputClass = "mt-2 w-full rounded-xl border border-[#d7d2c9] bg-white px-4 py-3 text-sm outline-none transition-colors focus:border-[#e85b43] disabled:cursor-not-allowed disabled:bg-[#f3f0ea] disabled:text-[#8a8579] disabled:opacity-100";

  return (
    <AccountPage title="Account settings" description="Keep your profile details up to date for parcel handoffs and trip coordination.">
      {loading && <p className="mb-5 text-sm text-[#62645f]">Loading your account details...</p>}
      {error && <p role="alert" className="mb-5 rounded-xl border border-[#e85b43]/30 bg-[#fff0eb] px-4 py-3 text-sm text-[#b33e2c]">{error}</p>}
      <form onSubmit={save} className="max-w-2xl overflow-hidden rounded-2xl border border-[#e4ded2] bg-white shadow-[0_20px_40px_-28px_rgba(24,59,58,0.25)]">
        <div className="h-[3px] bg-[#e85b43]" />
        <div className="space-y-8 p-6 sm:p-10">
          <div>
            <h2 className="text-lg font-semibold tracking-[-0.01em] text-[#183b3a]">Profile photo</h2>
            <p className="mt-1 text-sm text-[#8a8579]">Shown to travelers and senders you&apos;re matched with.</p>
            <div className="mt-5 flex items-center gap-4">
              <Avatar userId={userId} name={profile.name} className="size-16" refreshKey={avatarRefreshKey} />
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={pickPhoto} disabled={photoBusy} className="rounded-xl border border-[#d7d2c9] bg-white px-4 py-2.5 text-sm font-semibold text-[#183b3a] hover:border-[#e85b43] disabled:opacity-60">
                  {photoBusy ? (photoStatus || "Working...") : "Change photo"}
                </button>
                <button type="button" onClick={removePhoto} disabled={photoBusy} className="rounded-xl border border-[#d7d2c9] bg-white px-4 py-2.5 text-sm font-semibold text-[#b33e2c] hover:border-[#e85b43] disabled:opacity-60">
                  Remove
                </button>
                <input ref={photoInputRef} type="file" accept="image/*" onChange={uploadPhoto} className="hidden" />
              </div>
            </div>
            {photoError && <p role="alert" className="mt-3 text-sm text-[#b33e2c]">{photoError}</p>}
          </div>

          <div className="border-t border-[#eee9e1] pt-8">
            <h2 className="text-lg font-semibold tracking-[-0.01em] text-[#183b3a]">Personal information</h2>
            <p className="mt-1 text-sm text-[#8a8579]">This is how travelers and senders will recognize you.</p>
            <div className="mt-5 space-y-5">
              <label className="block text-sm font-semibold text-[#183b3a]">Name<input value={profile.name} disabled className={inputClass} /></label>
              <label className="block text-sm font-semibold text-[#183b3a]">Email<input type="email" required value={profile.email} onChange={(event) => setProfile({ ...profile, email: event.target.value })} className={inputClass} /></label>
              <div className="grid gap-5 sm:grid-cols-[0.35fr_1fr]">
                <label className="block text-sm font-semibold text-[#183b3a]">Code<input value={profile.phoneExt} disabled className={inputClass} /></label>
                <label className="block text-sm font-semibold text-[#183b3a]">Phone<input value={profile.phone} disabled className={inputClass} /></label>
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <label className="block text-sm font-semibold text-[#183b3a]">Gender<select value={profile.gender} disabled className={inputClass}><option value="">Not specified</option><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option></select></label>
                <label className="block text-sm font-semibold text-[#183b3a]">Date of birth<input type="date" value={profile.dob} disabled className={inputClass} /></label>
              </div>
              <p className="rounded-xl border border-[#e4ded2] bg-[#fbfaf7] px-4 py-3 text-xs leading-5 text-[#8a8579]">
                Name, phone, gender, and date of birth are checked against your DigiLocker identity verification and can&apos;t be changed here. Contact <a href="/support" className="font-semibold text-[#183b3a] underline">support</a> if any of these need to be corrected.
              </p>
            </div>
          </div>

          <div className="border-t border-[#eee9e1] pt-8">
            <h2 className="text-lg font-semibold tracking-[-0.01em] text-[#183b3a]">Identity verification</h2>
            <p className="mt-1 text-sm text-[#8a8579]">Verify your Aadhaar via DigiLocker to build trust with senders and travelers.</p>
            {profile.verified ? (
              <div className="mt-4 flex items-center gap-2 rounded-xl border border-[#bfe3d6] bg-[#eaf7f1] px-4 py-3 text-sm font-semibold text-[#1f6e52]">
                <ShieldCheck size={16} /> Verified
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={startVerification}
                  disabled={verifying}
                  className="mt-4 rounded-xl bg-[#183b3a] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#285c59] disabled:opacity-60"
                >
                  {verifying ? "Redirecting to DigiLocker..." : "Verify with DigiLocker"}
                </button>
                {verifyError && <p role="alert" className="mt-3 text-sm text-[#b33e2c]">{verifyError}</p>}
              </>
            )}
          </div>

          <div className="flex items-center gap-4 border-t border-[#eee9e1] pt-6">
            <button className="rounded-xl bg-[#183b3a] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#285c59]">Save changes</button>
            {message && <p role="status" className="text-sm font-medium text-[#285c59]">{message}</p>}
          </div>
        </div>
      </form>
    </AccountPage>
  );
}
