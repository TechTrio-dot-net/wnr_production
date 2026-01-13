// src/app/thank-you/page.tsx
import { Suspense } from "react";
import ThankYouClient from "./thank-you.client";

export default function ThankYouPage({
  searchParams,
}: {
  searchParams: {
    orderNumber?: string;
    status?: string;
    amount?: string;
    email?: string;
    phone?: string;
  };
}) {
  const initialOrderNumber = searchParams.orderNumber ?? "";
  const initialStatus = (searchParams.status ?? "success").toLowerCase();
  const initialAmount = Number(searchParams.amount ?? 0) || 0;
  const initialEmail = searchParams.email ? decodeURIComponent(searchParams.email) : "";
  const initialPhone = searchParams.phone ? decodeURIComponent(searchParams.phone) : "";

  return (
    <Suspense fallback={null}>
      <ThankYouClient
        initialOrderNumber={initialOrderNumber}
        initialStatus={initialStatus}
        initialAmount={initialAmount}
        initialEmail={initialEmail}
        initialPhone={initialPhone}
      />
    </Suspense>
  );
}
