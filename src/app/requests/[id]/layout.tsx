import { Suspense } from "react";

export default function RequestIdLayout({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<div className="min-h-screen bg-[#f6f2eb]" />}>{children}</Suspense>;
}
