"use client";

import { useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, Check, Clock, Trash2, UserX } from "lucide-react";
import { AccountPage } from "@/components/account/account-page";
import { clearWebSession, DELETE_CONFIRM_WORD, deleteAccount, deleteConfirmMatches, hasAccessToken } from "@/services/auth";

const REASONS = ["Found a better alternative", "Privacy or trust concerns", "I'm not using it enough", "Had a bad experience with a delivery", "Too expensive", "Other"];
const CONSEQUENCES = [
  { icon: Trash2, text: "Your profile, trip history, and reviews will be permanently deleted" },
  { icon: Clock, text: "You'll have 30 days to change your mind by logging back in" },
  { icon: AlertTriangle, text: "Any pending payments or payouts must be settled first" },
];

const subscribe = () => () => {};

// Maps DELETE /v1/users/me's error_code to copy; the guard refusals already
// come with a user-facing message from the backend.
const deletionErrorMessage = (err: unknown) => {
  const error = err as { status?: number; message?: string; data?: { error_code?: string; message?: string } } | undefined;
  switch (error?.data?.error_code) {
    case "ACTIVE_DELIVERY_REQUESTS":
    case "UNDER_INVESTIGATION":
      return error.data.message || "This account can't be deleted right now.";
    case "DELETE_CONFIRMATION_REQUIRED":
      return `Type ${DELETE_CONFIRM_WORD} in the box to confirm deleting your account.`;
    default:
      return "We could not delete your account. Please try again.";
  }
};

function DeletionPolicy() {
  return (
    <div className="max-w-xl space-y-6">
      <div className="border-t-2 border-[#e85b43] bg-[#fbfaf7] p-6 sm:p-8">
        <span className="grid size-12 place-items-center rounded-full bg-[#fff0eb] text-[#b33e2c]"><UserX size={22} /></span>
        <h2 className="mt-4 text-2xl font-semibold text-[#183b3a]">What happens when you delete your account</h2>
        <p className="mt-2 text-sm leading-6 text-[#62645f]">Deleting your Trickle account is permanent once the grace period ends. Here is what to expect:</p>
        <div className="mt-5 space-y-3">
          {CONSEQUENCES.map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-start gap-3">
              <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg bg-[#eef1f6] text-[#62645f]"><Icon size={14} /></span>
              <p className="text-sm leading-6 text-[#62645f]">{text}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t-2 border-[#e7b65c] bg-[#fbfaf7] p-6 sm:p-8">
        <h2 className="text-xl font-semibold text-[#183b3a]">Data retention after deletion</h2>
        <p className="mt-2 text-sm leading-6 text-[#62645f]">
          We immediately deactivate the account, revoke active sessions and notification tokens, and anonymize direct profile identifiers. Operational records tied to payments, disputes, fraud, safety, or tax obligations may be retained for a limited period, as described in our{" "}
          <Link href="/data-retention" className="font-semibold text-[#183b3a] underline decoration-[#e7b65c] decoration-2 underline-offset-4">data retention policy</Link>.
        </p>
        <p className="mt-3 text-sm leading-6 text-[#62645f]">
          For details on what information we collect and how it is used before deletion, see our{" "}
          <Link href="/privacy" className="font-semibold text-[#183b3a] underline decoration-[#e7b65c] decoration-2 underline-offset-4">privacy policy</Link>.
        </p>
      </div>

      <div className="border-t-2 border-[#183b3a] bg-[#183b3a] p-6 text-white sm:p-8">
        <h2 className="text-xl font-semibold">How to request deletion</h2>
        <p className="mt-2 text-sm leading-6 text-[#c5d4ce]">Account deletion can only be completed while signed in, and you confirm it by typing {DELETE_CONFIRM_WORD}. Sign in to your account, then return to this page (or Account Settings) to start the request.</p>
        <Link href="/register" className="mt-5 inline-block rounded-xl bg-[#e85b43] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#cf4935]">Sign in to continue</Link>
      </div>

      <p className="text-sm leading-6 text-[#62645f]">Questions about account deletion? Email <a href="mailto:support@trickle.org.in" className="font-semibold text-[#e85b43] underline">support@trickle.org.in</a>.</p>
    </div>
  );
}

function DeletionFlow() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [reason, setReason] = useState<string | null>(null);
  const [understood, setUnderstood] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  // Steps: 1 consequences → 2 optional reason → 3 tick + type DELETE → 4 done.
  // No SMS code: the user is already signed in.
  const canSubmit = understood && deleteConfirmMatches(confirmText) && !deleting;

  const submitDeletion = async () => {
    if (!canSubmit) return;
    setDeleting(true);
    setError("");
    try {
      await deleteAccount();
      setStep(4);
    } catch (err) {
      setError(deletionErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  const finishLogout = () => {
    clearWebSession();
    router.replace("/register");
  };

  const deletionDate = new Date();
  deletionDate.setDate(deletionDate.getDate() + 30);
  const deletionDateText = deletionDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  return (
    <div className="max-w-xl space-y-6">
      {step > 1 && step < 4 && (
        <button type="button" onClick={() => setStep((value) => value - 1)} className="text-sm font-semibold text-[#285c59]">‹ Back</button>
      )}

      {step === 1 && (
        <div className="border-t-2 border-[#e85b43] bg-[#fbfaf7] p-6 sm:p-8">
          <span className="grid size-12 place-items-center rounded-full bg-[#fff0eb] text-[#b33e2c]"><UserX size={22} /></span>
          <h2 className="mt-4 text-2xl font-semibold text-[#183b3a]">We&apos;re sorry to see you go</h2>
          <p className="mt-2 text-sm leading-6 text-[#62645f]">Deleting your account is permanent once the grace period ends. Here&apos;s what happens:</p>
          <div className="mt-5 space-y-3">
            {CONSEQUENCES.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-start gap-3">
                <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg bg-[#eef1f6] text-[#62645f]"><Icon size={14} /></span>
                <p className="text-sm leading-6 text-[#62645f]">{text}</p>
              </div>
            ))}
          </div>
          <button type="button" onClick={() => setStep(2)} className="mt-6 rounded-xl bg-[#183b3a] px-5 py-3 text-sm font-semibold text-white hover:bg-[#285c59]">Continue</button>
        </div>
      )}

      {step === 2 && (
        <div className="border-t-2 border-[#e85b43] bg-[#fbfaf7] p-6 sm:p-8">
          <h2 className="text-2xl font-semibold text-[#183b3a]">Help us improve</h2>
          <p className="mt-2 text-sm leading-6 text-[#62645f]">Optional, and won&apos;t affect your account deletion.</p>
          <div className="mt-5 space-y-2">
            {REASONS.map((item) => {
              const active = reason === item;
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => setReason(active ? null : item)}
                  className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left text-sm ${active ? "border-[#b33e2c] bg-[#fff0eb] text-[#183b3a]" : "border-[#d7d2c9] bg-white text-[#183b3a]"}`}
                >
                  {item}
                  <span className={`grid size-5 place-items-center rounded-full border ${active ? "border-[#b33e2c] bg-[#b33e2c]" : "border-[#d7d2c9]"}`}>{active && <Check size={11} className="text-white" />}</span>
                </button>
              );
            })}
          </div>
          <button type="button" onClick={() => setStep(3)} className="mt-6 rounded-xl bg-[#183b3a] px-5 py-3 text-sm font-semibold text-white hover:bg-[#285c59]">Continue</button>
        </div>
      )}

      {step === 3 && (
        <div className="border-t-2 border-[#e85b43] bg-[#fbfaf7] p-6 sm:p-8">
          <span className="grid size-12 place-items-center rounded-full bg-[#fff0eb] text-[#b33e2c]"><AlertTriangle size={22} /></span>
          <h2 className="mt-4 text-2xl font-semibold text-[#183b3a]">This is permanent after 30 days</h2>
          <p className="mt-2 text-sm leading-6 text-[#62645f]">Your account will enter a 30-day grace period, then be permanently deleted on {deletionDateText}.</p>
          <label className="mt-5 flex items-start gap-3 text-sm leading-6 text-[#62645f]">
            <input type="checkbox" checked={understood} onChange={(event) => setUnderstood(event.target.checked)} className="mt-1" />
            I understand this action is permanent and cannot be undone after the grace period.
          </label>
          <label htmlFor="delete-confirm-input" className="mt-5 block text-sm font-semibold text-[#183b3a]">Type {DELETE_CONFIRM_WORD} to confirm</label>
          <p id="delete-confirm-hint" className="mt-1 text-xs leading-5 text-[#62645f]">Type the word {DELETE_CONFIRM_WORD} exactly as shown. No code will be sent to your phone.</p>
          <input
            id="delete-confirm-input"
            data-testid="delete-confirm-input"
            aria-describedby="delete-confirm-hint"
            value={confirmText}
            onChange={(event) => setConfirmText(event.target.value.toUpperCase())}
            placeholder={DELETE_CONFIRM_WORD}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="characters"
            spellCheck={false}
            className="mt-2 w-full rounded-xl border border-[#d7d2c9] bg-white px-4 py-3 text-sm outline-none focus:border-[#e85b43]"
          />
          {error && <p role="alert" className="mt-2 text-sm text-[#b33e2c]">{error}</p>}
          <button
            type="button"
            data-testid="delete-confirm-submit"
            disabled={!canSubmit}
            onClick={submitDeletion}
            className="mt-6 flex items-center gap-2 rounded-xl bg-[#b33e2c] px-5 py-3 text-sm font-semibold text-white hover:bg-[#98301f] disabled:opacity-50"
          >
            <Trash2 size={15} />
            {deleting ? "Deleting..." : "Delete my account"}
          </button>
        </div>
      )}

      {step === 4 && (
        <div className="flex flex-col items-center border-t-2 border-[#e85b43] bg-[#fbfaf7] p-8 text-center">
          <span className="grid size-14 place-items-center rounded-full bg-[#183b3a] text-white"><Check size={24} /></span>
          <h2 className="mt-4 text-2xl font-semibold text-[#183b3a]">Deletion scheduled</h2>
          <p className="mt-2 max-w-sm text-sm leading-6 text-[#62645f]">Your account will be permanently deleted on <span className="font-semibold text-[#183b3a]">{deletionDateText}</span>. You can cancel this anytime before then by simply logging back in.</p>
          <button type="button" onClick={finishLogout} className="mt-6 rounded-xl bg-[#183b3a] px-6 py-3 text-sm font-semibold text-white hover:bg-[#285c59]">Log out</button>
        </div>
      )}
    </div>
  );
}

export default function AccountDeletionPage() {
  const authenticated = useSyncExternalStore(subscribe, hasAccessToken, () => false);
  return (
    <AccountPage
      eyebrow="Account deletion"
      title="Delete your Trickle account"
      description={authenticated ? "This is permanent once the 30-day grace period ends. Here is what to expect before you continue." : "Here is what happens when you delete your Trickle account, and how to request it."}
    >
      {authenticated ? <DeletionFlow /> : <DeletionPolicy />}
    </AccountPage>
  );
}
