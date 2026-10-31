"use client";

import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { apiRequest } from "@/services/api-client";
import { startDigilockerVerification } from "@/services/digilocker";

type SelfProfile = { gender?: string; dob?: string; verified?: boolean };

// A reusable "please verify your identity" prompt — e.g. shown to a sender
// after a traveler asks them to verify (see requests/[id]'s
// request-verification flow). Self-contained: fetches the viewer's own
// profile (GET /v1/users/me, same as account/settings) so it can be mounted
// from anywhere without the caller already having that data loaded.
//
// Mirrors ConfirmModal's visual shell (centered card, top accent bar,
// "TRICKLE" eyebrow), but the action area isn't a confirm/cancel pair — a
// single "Verify now" action that's sometimes replaced entirely by a
// blocking message (missing gender/dob) — so it's built as its own small
// modal rather than forced into ConfirmModal's confirm/cancel API.
export function VerifyPromptModal({
  open,
  reason,
  onClose,
}: {
  open: boolean;
  reason?: string;
  onClose: () => void;
}) {
  const [profile, setProfile] = useState<SelfProfile | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState("");

  useEffect(() => {
    if (!open) return;
    apiRequest<SelfProfile>("/v1/users/me")
      .then(setProfile)
      .catch(() => undefined);
  }, [open]);

  if (!open) return null;

  // Same gate as account/settings' startVerification — DigiLocker needs
  // both gender and dob to match against Aadhaar.
  const missingIdentityFields = Boolean(profile) && (!profile?.gender || !profile?.dob);

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1b1d1c]/45 p-5" onClick={onClose} role="presentation">
      <div
        className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-[#ded8ce] bg-white p-6 shadow-xl"
        onClick={(event) => event.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
        aria-label="Verify your identity"
      >
        <span className="absolute inset-x-0 top-0 h-1 bg-[#e7b65c]" aria-hidden="true" />
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#e85b43]">Trickle</p>
        <h3 className="mt-2 text-2xl font-semibold leading-tight text-[#183b3a]">Verify your identity</h3>
        {reason && <p className="mt-2.5 text-sm leading-6 text-[#62645f]">{reason}</p>}

        {profile?.verified ? (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-[#bfe3d6] bg-[#eaf7f1] px-4 py-3 text-sm font-semibold text-[#1f6e52]">
            <ShieldCheck size={16} /> You&apos;re already verified.
          </div>
        ) : missingIdentityFields ? (
          <p className="mt-4 rounded-xl border border-[#e4ded2] bg-[#fbfaf7] px-4 py-3 text-sm text-[#8a8579]">
            Fill in your gender and date of birth under Account settings, then save, before verifying — DigiLocker needs both to confirm it&apos;s really you.
          </p>
        ) : (
          <>
            <button
              type="button"
              onClick={startVerification}
              disabled={verifying}
              className="mt-4 w-full rounded-xl bg-[#183b3a] py-3 text-sm font-semibold text-white transition-colors hover:bg-[#285c59] disabled:opacity-60"
            >
              {verifying ? "Redirecting to DigiLocker..." : "Verify with DigiLocker"}
            </button>
            {verifyError && <p role="alert" className="mt-3 text-sm text-[#b33e2c]">{verifyError}</p>}
          </>
        )}

        <button
          type="button"
          onClick={onClose}
          className="mt-3 w-full rounded-xl border border-[#d7d2c9] py-3 text-sm font-semibold text-[#183b3a] hover:border-[#e85b43]"
        >
          {profile?.verified ? "Close" : "Not now"}
        </button>
      </div>
    </div>
  );
}
