"use client";

import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import { ExternalLink, ShieldCheck } from "lucide-react";
import { AccountPage } from "@/components/account/account-page";
import { Avatar } from "@/components/ui/avatar";
import { apiRequest } from "@/services/api-client";
import { buildDeviceDetails, getWebProfile, getWebUserId } from "@/services/auth";
import { deleteMyProfilePic, invalidateAvatarCache, notifyAvatarChanged, uploadProfilePic, waitForAvatarUrl } from "@/services/files";
import { startDigilockerVerification } from "@/services/digilocker";

// The API stores dob as DD-MM-YYYY (validated with Go layout 02-01-2006); <input type="date"> only takes YYYY-MM-DD.
const toInputDate = (apiDate: string) => {
  const match = apiDate.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : /^\d{4}-\d{2}-\d{2}$/.test(apiDate) ? apiDate : "";
};
const toApiDate = (inputDate: string) => {
  const [year, month, day] = inputDate.split("-");
  return inputDate ? `${day}-${month}-${year}` : "";
};

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
  const [photoExpanded, setPhotoExpanded] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoStatus, setPhotoStatus] = useState("");
  const [photoError, setPhotoError] = useState("");
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState("");
  // Gender/DOB are optional at signup but DigiLocker needs both to match
  // against Aadhaar — see the Personal information fields below, which
  // become editable (once) exactly when either is still missing.
  const missingIdentityFields = !profile.gender || !profile.dob;

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
      if (userId) {
        invalidateAvatarCache(userId);
        await waitForAvatarUrl(userId);
        notifyAvatarChanged(userId);
      }
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
    const refreshAvatar = () => {
      if (!userId) return;
      invalidateAvatarCache(userId);
      notifyAvatarChanged(userId);
    };
    try {
      await deleteMyProfilePic();
      refreshAvatar();
      setPhotoExpanded(false);
    } catch (requestError) {
      const status = (requestError as { status?: number })?.status;
      if (status === 404) refreshAvatar();
      else setPhotoError(requestError instanceof Error ? requestError.message : "Could not remove your photo.");
    } finally {
      setPhotoBusy(false);
    }
  };

  const loadProfile = () =>
    apiRequest<Profile>("/v1/users/me").then((response) =>
      setProfile((current) => ({ ...current, ...response, notificationPreferences: { ...current.notificationPreferences, ...response.notificationPreferences } })),
    );

  // DigiLocker's own site in a new tab (never an embedded iframe — same
  // RFC 8252 "no embedded user-agent" reasoning the mobile app follows with
  // the system browser). The backend's callback 302s that tab to
  // /account/verify/result; this tab re-reads the profile when the user comes back.
  // The tab is opened synchronously in the click: opening it after the await is a popup and gets blocked.
  const startVerification = async () => {
    const verificationTab = window.open("", "_blank");
    if (verificationTab) verificationTab.opener = null;
    setVerifying(true);
    setVerifyError("");
    try {
      const { authorizeUrl } = await startDigilockerVerification();
      if (!authorizeUrl) throw new Error("DigiLocker verification is not available right now.");
      if (verificationTab) verificationTab.location.href = authorizeUrl;
      else window.location.href = authorizeUrl;
      window.addEventListener("focus", () => loadProfile().catch(() => undefined), { once: true });
    } catch (requestError) {
      verificationTab?.close();
      setVerifyError(requestError instanceof Error ? requestError.message : "DigiLocker verification could not be started. Please try again.");
    } finally {
      setVerifying(false);
    }
  };

  useEffect(() => {
    loadProfile()
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
            {/* Same two-column structure in both states; only the photo's size transitions, so a toggle never reflows in a jump. */}
            <div className="flex items-start gap-5 sm:gap-7">
              <button
                type="button"
                onClick={() => setPhotoExpanded((expanded) => !expanded)}
                aria-expanded={photoExpanded}
                aria-label={photoExpanded ? "Show smaller photo" : "View larger photo"}
                title={photoExpanded ? "Show smaller photo" : "View larger photo"}
                className={`flex shrink-0 rounded-full ring-offset-2 transition-[width,height,box-shadow] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:ring-2 hover:ring-[#e85b43]/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e85b43] motion-reduce:transition-none ${
                  photoExpanded ? "size-32 cursor-zoom-out shadow-[0_16px_32px_-18px_rgba(24,59,58,0.45)] sm:size-44" : "size-20 cursor-zoom-in"
                }`}
              >
                <Avatar userId={userId} name={profile.name} className="size-full" />
              </button>
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-semibold tracking-[-0.01em] text-[#183b3a]">Profile photo</h2>
                <p className="mt-1 text-sm text-[#8a8579]">Shown to travelers and senders you&apos;re matched with.</p>
                <div className="mt-4 inline-flex flex-col gap-2">
                  <button type="button" onClick={pickPhoto} disabled={photoBusy} className="cursor-pointer rounded-xl border border-[#d7d2c9] bg-white px-4 py-2.5 text-sm font-semibold text-[#183b3a] hover:border-[#e85b43] disabled:cursor-default disabled:opacity-60">
                    {photoBusy ? (photoStatus || "Working...") : "Change photo"}
                  </button>
                  <button type="button" onClick={removePhoto} disabled={photoBusy} className="cursor-pointer rounded-xl border border-[#d7d2c9] bg-white px-4 py-2.5 text-sm font-semibold text-[#b33e2c] hover:border-[#e85b43] disabled:cursor-default disabled:opacity-60">
                    Remove
                  </button>
                  <input ref={photoInputRef} type="file" accept="image/*" onChange={uploadPhoto} className="hidden" />
                </div>
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
                <label className="block text-sm font-semibold text-[#183b3a]">
                  Gender {!profile.gender && <span className="font-normal text-[#8a8579]">(optional, but needed to verify your identity)</span>}
                  <select value={profile.gender} disabled={Boolean(profile.gender)} onChange={(event) => setProfile({ ...profile, gender: event.target.value })} className={inputClass}>
                    <option value="">Not specified</option><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option>
                  </select>
                </label>
                <label className="block text-sm font-semibold text-[#183b3a]">
                  Date of birth {!profile.dob && <span className="font-normal text-[#8a8579]">(optional, but needed to verify your identity)</span>}
                  <input type="date" value={toInputDate(profile.dob)} disabled={Boolean(profile.dob)} onChange={(event) => setProfile({ ...profile, dob: toApiDate(event.target.value) })} className={inputClass} />
                </label>
              </div>
              <p className="rounded-xl border border-[#e4ded2] bg-[#fbfaf7] px-4 py-3 text-xs leading-5 text-[#8a8579]">
                Name and phone can&apos;t be changed here. Gender and date of birth are optional, but matched against your DigiLocker identity verification once you provide them — enter them exactly as they appear on your Aadhaar, and save, before they&apos;re locked permanently. Contact{" "}
                <a href="/support" className="font-semibold text-[#183b3a] underline">support</a> if any of your locked details need to be corrected.
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
            ) : missingIdentityFields ? (
              <p className="mt-4 rounded-xl border border-[#e4ded2] bg-[#fbfaf7] px-4 py-3 text-sm text-[#8a8579]">
                Fill in your gender and date of birth under Personal information above, then save, before verifying — DigiLocker needs both to confirm it&apos;s really you.
              </p>
            ) : (
              <>
                <button
                  type="button"
                  onClick={startVerification}
                  disabled={verifying}
                  aria-label="Verify with DigiLocker (opens in a new tab)"
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#183b3a] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#285c59] disabled:opacity-60"
                >
                  {verifying ? "Opening DigiLocker..." : "Verify with DigiLocker"}
                  <ExternalLink size={15} aria-hidden="true" />
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
