"use client";

import { usePathname } from "next/navigation";
import { ReactNode } from "react";

export default function HideOnLogin({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  // Hide ONLY on /login (and any nested routes like /login/something if you add later)
  const isLogin = pathname === "/login" || pathname?.startsWith("/login/");

  if (isLogin) return null;
  return <>{children}</>;
}
