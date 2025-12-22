// src/app/payment-failed/page.tsx
import { Suspense } from "react";
import PaymentFailedClient from "./failed.client";

export default function PaymentFailedPage({
  searchParams,
}: {
  searchParams: { orderNumber?: string; reason?: string };
}) {
  const orderNumber = searchParams.orderNumber ?? "";
  const reason = searchParams.reason ? decodeURIComponent(searchParams.reason) : "";
  return (
    <Suspense fallback={null}>
      <PaymentFailedClient initialOrderNumber={orderNumber} initialReason={reason} />
    </Suspense>
  );
}
