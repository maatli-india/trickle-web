"use client";

import { useEffect, useState } from "react";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { listNotifications, markNotificationRead, type Notification } from "@/services/notifications";
import { extractListItems } from "@/types/travel";

const isToday = (value?: string) => {
  if (!value) return false;
  const date = new Date(value);
  const now = new Date();
  return date.toDateString() === now.toDateString();
};

const formatTime = (value?: string) => (value ? new Date(value).toLocaleString() : "");

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listNotifications({ page: 1, limit: 50 })
      .then((response) => setNotifications(extractListItems<Notification>(response)))
      .catch(() => setNotifications([]))
      .finally(() => setLoading(false));
  }, []);

  const markRead = (id: string) => {
    setNotifications((current) => current.map((item) => (item.id === id ? { ...item, read: true, readAt: new Date().toISOString() } : item)));
    markNotificationRead(id).catch(() => undefined);
  };

  const today = notifications.filter((item) => isToday(item.createdAt));
  const earlier = notifications.filter((item) => !isToday(item.createdAt));

  const renderGroup = (label: string, items: Notification[]) =>
    items.length > 0 && (
      <div key={label}>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#62645f]">{label}</p>
        <div className="mt-3 space-y-2">
          {items.map((item) => {
            const isRead = item.read || Boolean(item.readAt);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => markRead(item.id)}
                className={`flex w-full items-start gap-3 rounded-xl border p-4 text-left transition ${
                  isRead ? "border-[#ded8ce] bg-[#fbfaf7]" : "border-[#e7b65c]/60 bg-[#fff4d8]"
                }`}
              >
                {!isRead && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-[#e85b43]" aria-hidden="true" />}
                <div className="min-w-0 flex-1">
                  <p className={`text-sm ${isRead ? "font-medium text-[#183b3a]" : "font-semibold text-[#183b3a]"}`}>{item.title || "Notification"}</p>
                  {(item.message || item.body) && <p className="mt-1 text-sm text-[#62645f]">{item.message || item.body}</p>}
                  <p className="mt-1 text-xs text-[#a7a297]">{formatTime(item.createdAt)}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );

  return (
    <div className="flex min-h-screen flex-col bg-[#f6f2eb] text-[#1b1d1c]">
      <SiteHeader />
      <main className="mx-auto max-w-3xl flex-1 px-5 pb-32 sm:px-8">
        <section className="border-b border-[#ded8ce] py-12 sm:py-16">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#e85b43]">Updates</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">Notifications</h1>
        </section>
        <div className="space-y-8 py-10">
          {loading && <p className="text-sm text-[#62645f]">Loading notifications...</p>}
          {!loading && notifications.length === 0 && (
            <div className="border-t-2 border-[#e7b65c] bg-[#fbfaf7] px-6 py-8">
              <h2 className="text-xl font-semibold text-[#183b3a]">You&apos;re all caught up</h2>
              <p className="mt-2 text-sm text-[#62645f]">New activity on your trips and requests will show up here.</p>
            </div>
          )}
          {renderGroup("Today", today)}
          {renderGroup("Earlier", earlier)}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
