"use client";
import Link from "next/link";

export default function EmptyState({
  title,
  description,
  cta
}: {
  title: string;
  description?: string;
  cta?: React.ReactNode;
}) {
  return (
    <div className="text-center py-10">
      <h3 className="font-title text-xl">{title}</h3>
      {description && <p className="muted mt-2">{description}</p>}
      {cta && <div className="mt-4">{cta}</div>}
      {!cta && (
        <Link href="/products" className="btn btn-primary mt-4">
          Browse products
        </Link>
      )}
    </div>
  );
}
