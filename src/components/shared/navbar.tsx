"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import { Bot, LogOut, Menu, Shield, User as UserIcon, X } from "lucide-react";
import { User } from "@supabase/supabase-js";
import { toast } from "sonner";
import { GlassNavbar } from "@/components/ui/glass-navbar";

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string>("user");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();
        if (profile?.role) {
          setRole(profile.role);
        }
      }
    }
    loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  async function handleLogout() {
    await supabase.auth.signOut();
    toast.success("Logged out successfully");
    router.push("/login");
    router.refresh();
  }

  return (
    <GlassNavbar>
      {/* Brand Logo */}
      <Link href="/" className="flex items-center space-x-2.5 group">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-primary to-violet-500 text-white shadow-md shadow-primary/25 transition-transform duration-200 group-hover:scale-105 border border-white/20">
          <Bot className="h-5 w-5" />
        </div>
        <span className="text-lg font-bold tracking-tight text-foreground font-display">
          Interview<span className="text-primary">AI</span>
        </span>
      </Link>

      {/* Desktop Navigation Links */}
      <nav className="hidden md:flex items-center space-x-1 sm:space-x-2">
        {user ? (
          <>
            <Link
              href="/dashboard"
              className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-medium transition-all ${
                pathname === "/dashboard"
                  ? "bg-white/10 dark:bg-white/10 text-primary font-semibold shadow-inner border border-white/10"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/5"
              }`}
            >
              Dashboard
            </Link>
            <Link
              href="/resume"
              className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-medium transition-all ${
                pathname === "/resume"
                  ? "bg-white/10 dark:bg-white/10 text-primary font-semibold shadow-inner border border-white/10"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/5"
              }`}
            >
              Resume & ATS
            </Link>
            <Link
              href="/interview/new"
              className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-medium transition-all ${
                pathname.startsWith("/interview")
                  ? "bg-white/10 dark:bg-white/10 text-primary font-semibold shadow-inner border border-white/10"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/5"
              }`}
            >
              Mock Interview
            </Link>

            {role === "admin" && (
              <Link
                href="/admin"
                className={`flex items-center gap-1.5 rounded-xl px-3 py-1 text-xs font-bold uppercase tracking-wider transition-all ${
                  pathname.startsWith("/admin")
                    ? "bg-primary text-primary-foreground shadow-sm shadow-primary/30"
                    : "glass-pill text-muted-foreground hover:text-primary hover:border-primary/40"
                }`}
              >
                <Shield className="h-3.5 w-3.5" />
                Admin
              </Link>
            )}

            <div className="flex items-center gap-3 pl-3 ml-2 border-l border-white/10">
              <span className="hidden lg:inline-flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
                <UserIcon className="h-3.5 w-3.5" />
                {user.email?.split("@")[0]}
              </span>
              <button
                onClick={handleLogout}
                className="inline-flex h-8 w-8 items-center justify-center rounded-xl glass-panel text-muted-foreground transition-all hover:text-foreground hover:border-white/30"
                title="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </>
        ) : (
          <div className="flex items-center space-x-3">
            <Link
              href="/login"
              className="text-xs sm:text-sm font-medium text-muted-foreground transition-colors hover:text-foreground px-3 py-1.5"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="rounded-xl bg-primary px-4 py-2 text-xs sm:text-sm font-semibold text-primary-foreground shadow-md shadow-primary/25 transition-all hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98] border border-primary/40"
            >
              Get Started
            </Link>
          </div>
        )}
      </nav>

      {/* Mobile Menu Hamburger */}
      <div className="flex md:hidden items-center gap-2">
        {user && (
          <button
            onClick={handleLogout}
            className="inline-flex h-8 w-8 items-center justify-center rounded-xl glass-panel text-muted-foreground"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        )}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl glass-panel text-foreground"
          aria-label="Toggle navigation menu"
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile Drawer (Glass) */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-x-0 top-16 bg-background/90 backdrop-blur-2xl border-b border-white/10 p-4 space-y-2 z-50 animate-in slide-in-from-top-4 duration-200 shadow-2xl">
          {user ? (
            <div className="flex flex-col space-y-1">
              <div className="px-3 py-2 text-xs text-muted-foreground border-b border-white/10 mb-2">
                Signed in as <span className="font-semibold text-foreground">{user.email}</span>
              </div>
              <Link
                href="/dashboard"
                className={`px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  pathname === "/dashboard"
                    ? "bg-white/10 text-primary font-bold"
                    : "text-muted-foreground"
                }`}
              >
                Dashboard
              </Link>
              <Link
                href="/resume"
                className={`px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  pathname === "/resume"
                    ? "bg-white/10 text-primary font-bold"
                    : "text-muted-foreground"
                }`}
              >
                Resume & ATS
              </Link>
              <Link
                href="/interview/new"
                className={`px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  pathname.startsWith("/interview")
                    ? "bg-white/10 text-primary font-bold"
                    : "text-muted-foreground"
                }`}
              >
                Mock Interview
              </Link>

              {role === "admin" && (
                <Link
                  href="/admin"
                  className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-sm font-bold text-primary bg-primary/10"
                >
                  <Shield className="h-4 w-4" />
                  Admin Console
                </Link>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-2 pt-2">
              <Link
                href="/login"
                className="w-full text-center py-2 text-sm font-medium rounded-xl glass-panel"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="w-full text-center py-2 text-sm font-semibold rounded-xl bg-primary text-primary-foreground shadow"
              >
                Get Started
              </Link>
            </div>
          )}
        </div>
      )}
    </GlassNavbar>
  );
}
