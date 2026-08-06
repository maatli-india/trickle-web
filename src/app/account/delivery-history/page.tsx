import { AccountPage, EmptyState } from "@/components/account/account-page";

export default function DeliveryHistoryPage() {
  return <AccountPage title="Delivery history" description="Keep track of parcel requests and completed handoffs in one place."><EmptyState title="Delivery history is coming together" description="New parcel requests can be created from Home. The delivery history view will appear here once the server exposes the request list for your account." /></AccountPage>;
}
