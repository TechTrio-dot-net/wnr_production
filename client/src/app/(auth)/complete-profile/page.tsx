import { Suspense } from "react";
import CompleteProfileClient from "./CompleteProfileClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function CompleteProfilePage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-lg p-6">Loading…</div>}>
      <CompleteProfileClient />
    </Suspense>
  );
}
