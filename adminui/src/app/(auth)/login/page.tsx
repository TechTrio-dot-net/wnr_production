// src/app/(auth)/login/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { fetchMe as fetchCurrentUser } from "@/lib/authClient";
import { Eye, EyeOff, Loader2, Lock, Mail, ArrowRight } from "lucide-react";

const RAW_BASE = process.env.NEXT_PUBLIC_API_BASE || "";
const API_BASE = RAW_BASE.replace(/\/+$/, "");

export default function LoginPage() {
  const { setUser } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPw, setShowPw] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (typeof window === "undefined") return;
        const token = window.localStorage.getItem("wnr_admin_token");
        if (!token) return;
        const u = await fetchCurrentUser();
        if (!mounted) return;
        if (u) {
          setUser(u);
          router.replace("/");
          router.refresh();
        } else {
          try { window.localStorage.removeItem("wnr_admin_token"); } catch { }
        }
      } catch {
        // ignore
      }
    })();
    return () => { mounted = false; };
  }, [router, setUser]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API_BASE}/api/admin/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
        }),
      });

      const data = await res.json().catch(() => null);

      if (res.ok) {
        try {
          if (data?.token && typeof window !== "undefined") {
            window.localStorage.setItem("wnr_admin_token", data.token);
          }
        } catch { }

        if (data?.user) {
          setUser(data.user);
        } else {
          setUser(null);
        }
        router.replace("/");
        router.refresh();
        return;
      }

      let msg = data?.message || "Login failed";
      if (res.status === 401) msg = "Invalid email or password.";
      if (res.status === 403) msg = "Forbidden: admin access only.";
      setError(msg);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-background">
      {/* Background Effects */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/20 blur-[120px] animate-pulse-slow" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-rose-500/10 blur-[120px] animate-pulse-slow" style={{ animationDelay: "1.5s" }} />
      </div>

      <div className="relative z-10 w-full max-w-md px-4">
        <div className="bg-white/80 dark:bg-slate-950/50 backdrop-blur-xl border border-white/20 dark:border-slate-800 shadow-2xl rounded-3xl p-8 sm:p-10">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-rose-600 flex items-center justify-center shadow-lg mb-6 transform rotate-3 hover:rotate-6 transition-transform duration-300">
              <span className="text-3xl font-bold text-white">W</span>
            </div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Welcome Back</h1>
            <p className="text-muted-foreground mt-2 text-center text-sm">
              Enter your credentials to access the admin panel
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-4">
              <div className="relative group">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <input
                  type="email"
                  placeholder="Email address"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-3 bg-muted/50 border border-transparent focus:bg-background focus:border-primary/20 rounded-xl outline-none focus:ring-4 focus:ring-primary/10 transition-all placeholder:text-muted-foreground/50"
                />
              </div>

              <div className="relative group">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <input
                  type={showPw ? "text" : "password"}
                  placeholder="Password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full pl-10 pr-12 py-3 bg-muted/50 border border-transparent focus:bg-background focus:border-primary/20 rounded-xl outline-none focus:ring-4 focus:ring-primary/10 transition-all placeholder:text-muted-foreground/50"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm text-center font-medium animate-in fade-in slide-in-from-top-2">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full group relative flex items-center justify-center gap-2 py-3 px-4 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-medium transition-all shadow-lg shadow-primary/25 hover:shadow-primary/40 disabled:opacity-70 disabled:cursor-not-allowed overflow-hidden"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-xs text-muted-foreground">
              Protected by reCAPTCHA and subject to the Privacy Policy and Terms of Service.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
