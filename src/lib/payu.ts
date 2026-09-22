import type { PaymentOrder } from "@/services/parcel-matches";

// Redirects the browser to PayU's hosted checkout page via a synchronous
// hidden-form POST (the classic `_payment` flow — no CORS/XHR involved, PayU
// takes over the tab and returns the user via surl/furl). `hash` must be the
// hosted_checkout_hash signed server-side for this exact order.
export function redirectToPayUHostedCheckout(order: PaymentOrder, hash: string) {
  if (!order.checkoutUrl) {
    throw new Error("PayU checkout is not available for this order.");
  }

  const fields: Record<string, string> = {
    key: order.merchantKey,
    txnid: order.transactionId,
    amount: order.amount,
    productinfo: order.productInfo,
    firstname: order.firstName,
    email: order.email,
    phone: order.phone,
    surl: order.surl,
    furl: order.furl,
    hash,
    // Not part of the hash and not sent as a specific method (we want PayU's own
    // page to show the full method picker) — but PayU's _payment endpoint rejects
    // the request outright (misleadingly, as a hash error) if this field is absent
    // entirely. Confirmed empirically: pg must be present, empty is fine.
    pg: "",
  };

  const form = document.createElement("form");
  form.method = "POST";
  form.action = order.checkoutUrl;
  form.style.display = "none";

  for (const [name, value] of Object.entries(fields)) {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = value;
    form.appendChild(input);
  }

  document.body.appendChild(form);
  form.submit();
}
