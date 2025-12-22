// components/layout/Navbar.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { logout as clientLogout } from "@/lib/authClient";
import { Menu, User, LogOut, Sun, Moon, Search } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useTheme } from "next-themes";
import NotificationBell from "./NotificationBell";

export default function Navbar({ onToggleSidebar }: { onToggleSidebar: () => void }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { setUser } = useAuth();
  const router = useRouter(); // ✅ Move all hooks before conditional return

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  if (!mounted) {
    return (
      <header className="h-16 flex items-center justify-between px-6 border-b border-border/40 bg-background/50 backdrop-blur-md" />
    );
  }

  const isDark = resolvedTheme === "dark";

  async function handleLogoutFromMenu() {
    try {
      await clientLogout();
    } catch { }
    try { setMenuOpen(false); } catch { }
    try { setUser?.(null); } catch { }
    router.replace("/login");
    router.refresh();
  }

  return (
    <header
      className="sticky top-0 z-40 h-16 px-6 flex items-center justify-between gap-4 border-b border-border/40 bg-background/80 backdrop-blur-xl transition-all duration-300"
    >
      <div className="flex items-center gap-4">
        <button
          onClick={onToggleSidebar}
          aria-label="Toggle sidebar"
          className="md:hidden p-2 -ml-2 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
        >
          <Menu className="w-6 h-6" />
        </button>

        {/* Search Bar (Desktop) */}
        <div className="hidden md:flex items-center relative max-w-md">
          <Search className="absolute left-3 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search..."
            className="h-10 w-64 rounded-full bg-muted/50 border-transparent pl-9 pr-4 text-sm focus:bg-background focus:border-primary/20 focus:ring-2 focus:ring-primary/10 transition-all outline-none"
          />
        </div>
      </div>

      {/* Mobile Logo */}
      <div className="absolute inset-x-0 mx-auto w-fit md:hidden pointer-events-none">
        <Image src="/wildnroot.jpg" alt="Wild n Root" width={32} height={32} className="rounded-lg shadow-sm" />
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        {/* Notifications */}
        <NotificationBell />

        {/* Theme Toggle */}
        <button
          onClick={() => setTheme(isDark ? "light" : "dark")}
          aria-label="Toggle theme"
          className="p-2 rounded-full hover:bg-muted text-muted-foreground transition-colors"
        >
          {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>

        {/* User Menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((s) => !s)}
            className="flex items-center gap-2 p-1 pr-3 rounded-full hover:bg-muted transition-all border border-transparent hover:border-border/50"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-pink-600 flex items-center justify-center text-white shadow-sm">
              <User className="w-4 h-4" />
            </div>
          </button>

          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 mt-2 w-56 rounded-xl shadow-xl py-2 z-50 border border-border/50 bg-popover/95 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200"
            >
              <div className="px-4 py-2 border-b border-border/40 mb-1">
                <p className="text-sm font-medium">My Account</p>
                <p className="text-xs text-muted-foreground">Manage your profile</p>
              </div>

              <Link
                href="/editprofile"
                role="menuitem"
                className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted transition-colors"
                onClick={() => setMenuOpen(false)}
              >
                <User className="w-4 h-4 text-muted-foreground" />
                Edit Profile
              </Link>

              <div className="h-px bg-border/40 my-1" />

              <button
                role="menuitem"
                className="w-full text-left flex items-center gap-3 px-4 py-2.5 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                onClick={handleLogoutFromMenu}
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

