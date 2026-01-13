// components/Sidebar.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useTheme } from "next-themes";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Truck,
  Settings,
  X,
  Mailbox,
  LogOut,
  User2,
  ChevronLeft,
  ChevronRight,
  FileText,
  Users,
  Percent,
  Star,
  Coins,
  Ticket,
  MessageSquare,
  ClipboardList,
} from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { buildUrl } from "@/lib/api";

type SidebarProps = {
  open: boolean;             // mobile
  collapsed: boolean;        // desktop
  onCloseMobile: () => void;
  onToggleCollapse: () => void;
};

const MENU = [
  // { name: "Pre Launch", href: "/prelaunch", Icon: PiRocketLaunch },
  // { name: "Inventory", href: "/inventory", Icon: Boxes },
  // { name: "Sales & Payments", href: "/sales-payments", Icon: CreditCard },
  // { name: "Reports", href: "/reports", Icon: BarChart3 },
  // { name: "Coupons", href: "/coupons", Icon: Tag },
  // { name: "Testimonials", href: "/testimonials", Icon: MessageSquareQuote },
  { name: "Dashboard", href: "/", Icon: LayoutDashboard },
  { name: "Products", href: "/products", Icon: Package },
  { name: "Orders", href: "/orders", Icon: ShoppingCart },
  { name: "Shipping", href: "/shipping", Icon: Truck },
  { name: "Blogs", href: "/blogs", Icon: FileText },
  { name: "Reviews", href: "/reviews", Icon: Star },
  { name: "Client Testimonials", href: "/client-testimonials", Icon: MessageSquare },
  { name: "Rewards", href: "/rewards", Icon: Coins },
  { name: "Coupons", href: "/coupons", Icon: Ticket },
  { name: "Discounts", href: "/discounts", Icon: Percent },
  { name: "Inbox", href: "/inbox", Icon: Mailbox },
  { name: "Offer Strip", href: "/offer-strip", Icon: Percent },
  { name: "User Management", href: "/user-management", Icon: Users },
  { name: "Logs", href: "/logs", Icon: ClipboardList },
  { name: "Settings", href: "/settings", Icon: Settings },
];

export default function Sidebar({
  open,
  collapsed,
  onCloseMobile,
  onToggleCollapse,
}: SidebarProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const { user, setUser } = useAuth();
  const router = useRouter();

  useEffect(() => setMounted(true), []);

  const pathname = usePathname();
  const searchParams = useSearchParams();
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on ESC (mobile)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onCloseMobile(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCloseMobile]);

  // Click outside (mobile)
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!open) return;
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onCloseMobile();
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open, onCloseMobile]);

  const isDark = mounted ? resolvedTheme === "dark" : false;

  async function handleLogout() {
    try {
      try { if (typeof window !== "undefined") window.localStorage.removeItem("wnr_admin_token"); } catch {}
      await fetch(buildUrl("/api/admin/auth/logout"), { method: "POST" }).catch(() => {});
    } catch {}
    setUser(null);
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      {open && <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden" aria-hidden="true" />}

      <aside
        ref={panelRef}
        className={[
          "fixed md:sticky top-0 left-0 h-screen z-50 md:z-30 transition-all duration-300 ease-in-out flex flex-col",
          "border-r border-border/50",
          isDark ? "bg-background/95 backdrop-blur-xl" : "bg-white/90 backdrop-blur-xl",
          open ? "translate-x-0 shadow-2xl" : "-translate-x-full md:translate-x-0",
          collapsed ? "w-20" : "w-72",
        ].join(" ")}
        aria-label="Sidebar"
      >
        {/* Header */}
        <div className="h-20 flex items-center justify-between px-6 border-b border-border/40">
          <div className={`flex items-center gap-3 overflow-hidden transition-all duration-300 ${collapsed ? "justify-center w-full" : ""}`}>
            <div className="relative shrink-0">
              <Image
                src="/wildnroot.jpg"
                alt="Wild n Root"
                width={40}
                height={40}
                className="rounded-xl shadow-md ring-1 ring-border"
                priority
              />
            </div>
            {!collapsed && (
              <div className="leading-tight min-w-0 animate-fade-in">
                <p className="font-bold text-lg tracking-tight text-foreground truncate">Wild n&apos; Root</p>
                {/* <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Admin</p> */}
              </div>
            )}
          </div>

          {/* Close (mobile) */}
          <button
            onClick={onCloseMobile}
            className="md:hidden p-2 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Menu */}
        <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
          {MENU.map(({ name, href, Icon }) => {
            const [base, query] = href.split("?");
            let active = pathname === base;
            if (query && active) {
              const pairs = query.split("&").map((s) => s.split("="));
              for (const [k, v] of pairs) {
                if (searchParams.get(k) !== v) {
                  active = false;
                  break;
                }
              }
            }
            
            return (
              <Link
                key={href}
                href={href}
                className={[
                  "group flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all duration-200",
                  active
                    ? "bg-primary/10 text-primary shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  collapsed ? "justify-center" : "",
                ].join(" ")}
                title={collapsed ? name : undefined}
              >
                <Icon 
                  className={`w-5 h-5 transition-transform duration-200 ${active ? "text-primary scale-110" : "group-hover:scale-110"}`} 
                />
                {!collapsed && (
                  <span className="truncate animate-fade-in">{name}</span>
                )}
                
                {/* Active Indicator for collapsed state */}
                {collapsed && active && (
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-l-full" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer: Toggle + User */}
        <div className="p-4 border-t border-border/40 space-y-4">
          {/* Collapse Button (Desktop) */}
          <button
            onClick={onToggleCollapse}
            className="hidden md:flex w-full items-center justify-center p-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            {collapsed ? <ChevronRight className="w-5 h-5" /> : (
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider">
                <ChevronLeft className="w-4 h-4" />
                <span>Collapse Sidebar</span>
              </div>
            )}
          </button>

          {/* User Profile */}
          <div
            className={[
              "flex items-center gap-3 rounded-xl p-3 transition-colors",
              "bg-muted/50 hover:bg-muted border border-border/50",
              collapsed ? "justify-center" : "",
            ].join(" ")}
          >
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-primary">
              <User2 className="w-4 h-4" />
            </div>
            
            {!collapsed && (
              <div className="min-w-0 flex-1 animate-fade-in">
                <p className="text-sm font-semibold truncate text-foreground">
                  {user?.email?.split('@')[0] ?? "User"}
                </p>
                {/* <p className="text-xs text-muted-foreground truncate">
                  {user?.email ?? "Signed in"}
                </p> */}
              </div>
            )}

            {!collapsed && (
              <button
                onClick={handleLogout}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}

