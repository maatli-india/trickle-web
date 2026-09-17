import { redirect } from "next/navigation";

// Parcel request history now lives at /requests (Sent/Received tabs), which
// covers everything this page used to stub out.
export default function DeliveryHistoryPage() {
  redirect("/requests");
}
