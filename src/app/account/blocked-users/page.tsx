"use client";

import { useEffect, useState } from "react";
import { Ban } from "lucide-react";
import { AccountPage, EmptyState } from "@/components/account/account-page";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { listBlockedUsers, unblockUser, type BlockedUser } from "@/services/blocked-users";

export default function BlockedUsersPage() {
  const [users, setUsers] = useState<BlockedUser[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [confirmTarget, setConfirmTarget] = useState<BlockedUser | null>(null);
  const [unblocking, setUnblocking] = useState(false);

  const load = () => {
    listBlockedUsers()
      .then(setUsers)
      .catch(() => setError("We could not load your blocked users right now."))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const confirmUnblock = async () => {
    if (!confirmTarget) return;
    setUnblocking(true);
    try {
      await unblockUser(confirmTarget.userId || confirmTarget.id);
      setUsers((current) => current.filter((user) => user.id !== confirmTarget.id));
      setConfirmTarget(null);
    } catch {
      setError("We could not unblock this user. Please try again.");
    } finally {
      setUnblocking(false);
    }
  };

  return (
    <AccountPage title="Blocked users" description="Manage people you have blocked from sending you requests or contacting you on Trickle.">
      {loading && <p className="text-sm text-[#62645f]">Loading blocked users...</p>}
      {!loading && error && <p role="alert" className="mb-5 rounded-xl border border-[#e85b43]/30 bg-[#fff0eb] px-4 py-3 text-sm text-[#b33e2c]">{error}</p>}
      {!loading && users.length === 0 && !error && <EmptyState icon={Ban} title="No blocked users" description="Anyone you block will show up here so you can review or unblock them later." />}
      {!loading && users.length > 0 && (
        <div className="max-w-2xl overflow-hidden rounded-2xl border border-[#e4ded2] bg-white shadow-[0_20px_40px_-28px_rgba(24,59,58,0.2)]">
          {users.map((user) => (
            <div key={user.id} className="flex items-center justify-between gap-4 border-b border-[#eee9e1] px-5 py-4 last:border-0 sm:px-6">
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#fff0eb] text-[#b33e2c]">
                  <Ban size={16} />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[#183b3a]">{user.name || "Trickle user"}</p>
                  {user.phone && <p className="truncate text-xs text-[#a7a297]">{user.phone}</p>}
                </div>
              </div>
              <button type="button" onClick={() => setConfirmTarget(user)} className="shrink-0 rounded-full border border-[#d7d2c9] px-4 py-2 text-xs font-semibold text-[#183b3a] transition-colors hover:border-[#e85b43] hover:text-[#e85b43]">Unblock</button>
            </div>
          ))}
        </div>
      )}
      <ConfirmModal
        open={Boolean(confirmTarget)}
        title="Unblock this user?"
        message={`${confirmTarget?.name || "This user"} will be able to send you requests and contact you again.`}
        confirmLabel={unblocking ? "Unblocking..." : "Unblock"}
        loading={unblocking}
        onCancel={() => setConfirmTarget(null)}
        onConfirm={confirmUnblock}
      />
    </AccountPage>
  );
}
