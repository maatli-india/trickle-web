"use client";

// Mirrors the mobile app's ConfirmModal (src/components/ConfirmModal.js):
// centered card, top accent bar, "TRICKLE" eyebrow, title + message, and a
// cancel/confirm (or single-action) button row — in trickle-web's own
// cream/teal/orange palette. Used for every real confirm/decision dialog so
// alerts look and behave the same way across the app, instead of native
// window.confirm() or one-off styled divs.
export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
  destructive = false,
  singleAction = false,
  loading = false,
  children,
}: {
  open: boolean;
  title: string;
  message?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  destructive?: boolean;
  singleAction?: boolean;
  loading?: boolean;
  children?: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1b1d1c]/45 p-5" onClick={onCancel} role="presentation">
      <div
        className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-[#ded8ce] bg-white p-6 shadow-xl"
        onClick={(event) => event.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
      >
        <span className={`absolute inset-x-0 top-0 h-1 ${destructive ? "bg-[#e85b43]" : "bg-[#e7b65c]"}`} aria-hidden="true" />
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#e85b43]">Trickle</p>
        <h3 className="mt-2 text-2xl font-semibold leading-tight text-[#183b3a]">{title}</h3>
        {message && <p className="mt-2.5 text-sm leading-6 text-[#62645f]">{message}</p>}
        {children}
        <div className={`mt-6 flex gap-3 ${singleAction ? "flex-col" : ""}`}>
          {!singleAction && (
            <button type="button" onClick={onCancel} className="flex-1 rounded-xl border border-[#d7d2c9] py-3 text-sm font-semibold text-[#183b3a] hover:border-[#e85b43]">
              {cancelLabel}
            </button>
          )}
          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className={`flex-1 rounded-xl py-3 text-sm font-semibold transition disabled:opacity-60 ${
              destructive ? "bg-[#e85b43] text-white hover:bg-[#cf4935]" : "bg-[#183b3a] text-white hover:bg-[#285c59]"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
