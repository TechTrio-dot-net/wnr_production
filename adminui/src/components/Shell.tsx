// components/Shell.tsx
"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import { useAuth } from "@/components/auth/AuthProvider";

export default function Shell({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // mobile drawer
  const [mobileOpen, setMobileOpen] = useState(false);
  // desktop collapse (hydrate from localStorage AFTER mount)
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const v = typeof window !== "undefined" ? localStorage.getItem("sidebar-collapsed") : null;
    if (v !== null) setCollapsed(v === "true");
  }, []);

  useEffect(() => {
    if (mounted) localStorage.setItem("sidebar-collapsed", String(collapsed));
  }, [collapsed, mounted]);

  const toggleSidebar = () => {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setMobileOpen((s) => !s);
    } else {
      setCollapsed((s) => !s);
    }
  };

  // Until mounted, render a consistent layout (expanded width)
  // When user is not authenticated, hide sidebar and do not add left margin
  const { user } = useAuth();
  // Updated widths: w-72 (18rem) and w-20 (5rem)


  return (
    <div className="min-h-screen flex bg-background text-foreground transition-colors duration-300">
      {/* Sidebar uses mounted-safe theme and will not mismatch */}
      {user && (
        <Sidebar
          open={mobileOpen}
          collapsed={mounted ? collapsed : false}
          onCloseMobile={() => setMobileOpen(false)}
          onToggleCollapse={() => setCollapsed((s) => !s)}
        />
      )}
      <div className="flex-1 min-w-0 transition-all duration-300 ease-in-out">
        <Navbar onToggleSidebar={toggleSidebar} />
        <main className="p-6 md:p-8 max-w-7xl mx-auto animate-fade-in">{children}</main>
      </div>
    </div>
  );
}

