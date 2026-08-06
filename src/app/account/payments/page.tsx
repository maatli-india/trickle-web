import { AccountPage, EmptyState } from "@/components/account/account-page";

export default function PaymentsPage() {
  return <AccountPage title="Payments" description="View charges, refunds, and traveler payouts connected to your Trickle activity."><EmptyState title="No payment activity yet" description="Payment records will appear here after a delivery is matched and a payment is created." /></AccountPage>;
}
