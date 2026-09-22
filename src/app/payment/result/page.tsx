"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { acknowledgePayment } from "@/services/parcel-matches";

// PayU lands here after the hosted-checkout redirect (backend surl/furl ->
// /v1/payments/payu/return/{outcome} -> here). Money is already settled (or
// not) via PayU's webhook independently of this page — acknowledgePayment
// only records that the user saw the outcome, it never marks a payment paid.
export default function PaymentResultPage() {
  const searchParams = useSearchParams();
  const status = searchParams.get("status") === "success" ? "success" : "failure";
  const transactionId = searchParams.get("transactionId") || "";
  const entityId = searchParams.get("entityId") || "";
  const [acking, setAcking] = useState(status === "success" && !!entityId && !!transactionId);

  useEffect(() => {
    if (status !== "success" || !entityId || !transactionId) return;
    acknowledgePayment(entityId, transactionId)
      .catch(() => undefined)
      .finally(() => setAcking(false));
  }, [status, entityId, transactionId]);

  const backHref = entityId ? `/requests/${entityId}` : "/requests";

  return (
    <div className="flex min-h-screen flex-col bg-[#f6f2eb] text-[#1b1d1c]">
      <SiteHeader />
      <main className="mx-auto flex-1 max-w-xl px-5 py-16 text-center sm:px-8">
        {status === "success" ? (
          <>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#285c59]">Payment received</p>
            <h1 className="mt-3 text-3xl font-semibold text-[#183b3a]">Thanks — you&apos;re all set</h1>
            <p className="mt-3 text-sm text-[#62645f]">
              {acking
                ? "Confirming your payment..."
                : "We're finalising confirmation with PayU. This request will update automatically once it lands — usually within a few seconds."}
            </p>
          </>
        ) : (
          <>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#b33e2c]">Payment not completed</p>
            <h1 className="mt-3 text-3xl font-semibold text-[#183b3a]">Your payment didn&apos;t go through</h1>
            <p className="mt-3 text-sm text-[#62645f]">No amount was charged. You can try again from the request page.</p>
          </>
        )}
        {transactionId && <p className="mt-4 text-xs text-[#9a978d]">Reference: {transactionId}</p>}
        <Link href={backHref} className="mt-8 inline-block rounded-xl bg-[#183b3a] px-6 py-3 text-sm font-semibold text-white">
          Back to request
        </Link>
      </main>
      <SiteFooter />
    </div>
  );
}
