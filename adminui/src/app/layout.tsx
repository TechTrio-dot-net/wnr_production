// app/layout.tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "next-themes";
import Shell from "@/components/Shell";
import AuthProvider from "@/components/auth/AuthProvider";
import { Toaster } from "sonner";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import ErrorHandler from "@/components/ErrorHandler";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Wild n Root Admin Dashboard",
  description: "Admin dashboard for Wild n Root e-commerce management",
};

async function getInitialUser() {
  try {
    // Server-side cannot access client's localStorage token. Skip server-side auth
    // and let the client AuthProvider initialize from localStorage (Bearer token).
    return null;
  } catch {
    return null;
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const initialUser = await getInitialUser();

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen`} suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          {/* 👇 Provide the initial user from the server to all client components */}
          <ErrorBoundary>
            <ErrorHandler />
            <AuthProvider initialUser={initialUser}>
              <Shell>
                {children}
                <Toaster richColors position="top-right" closeButton />
              </Shell>
            </AuthProvider>
          </ErrorBoundary>
        </ThemeProvider>
      </body>
    </html>
  );
}
