"use client";

import { getOrCreateRole, type AppRole } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/appointments", label: "Appointments" },
  { href: "/services", label: "Dịch vụ" },
  { href: "/checkout", label: "Checkout" },
  { href: "/reports", label: "Báo cáo" },
  { href: "/team", label: "Nhân sự" },
];

function canAccess(role: AppRole, href: string) {
  if (role === "OWNER" || role === "MANAGER") return true;
  if (role === "RECEPTION") return ["/", "/appointments", "/checkout"].includes(href);
  if (role === "TECH") return ["/", "/appointments"].includes(href);
  if (role === "ACCOUNTANT") return ["/", "/checkout", "/reports"].includes(href);
  return false;
}

type AuthCache = { userId: string; email: string; role: AppRole; cachedAt: number };
let authCache: AuthCache | null = null;
const AUTH_CACHE_TTL = 5 * 60 * 1000;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string>("");
  const [role, setRole] = useState<AppRole>("RECEPTION");
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function run() {
      try {
        if (!supabase) {
          setLoading(false);
          return;
        }

        // Fast path: dùng cache RAM để chuyển trang mượt, không chờ round-trip auth mỗi lần
        if (authCache && Date.now() - authCache.cachedAt < AUTH_CACHE_TTL) {
          setEmail(authCache.email);
          setRole(authCache.role);
          setLoading(false);
          return;
        }

        // Fallback cache từ sessionStorage (khi reload tab)
        try {
          const raw = sessionStorage.getItem("nails.auth.cache");
          if (raw) {
            const parsed = JSON.parse(raw) as AuthCache;
            if (Date.now() - parsed.cachedAt < AUTH_CACHE_TTL) {
              authCache = parsed;
              setEmail(parsed.email);
              setRole(parsed.role);
              setLoading(false);
              return;
            }
          }
        } catch {
          // ignore cache parse errors
        }

        const { data } = await supabase.auth.getSession();
        const session = data.session;

        if (!session?.user) {
          router.replace("/login");
          return;
        }

        const userRole = await getOrCreateRole(session.user.id);
        if (!mounted) return;

        const nextCache: AuthCache = {
          userId: session.user.id,
          email: session.user.email ?? "",
          role: userRole,
          cachedAt: Date.now(),
        };
        authCache = nextCache;
        sessionStorage.setItem("nails.auth.cache", JSON.stringify(nextCache));

        setEmail(nextCache.email);
        setRole(nextCache.role);
        setLoading(false);
      } catch (e) {
        if (!mounted) return;
        setAuthError(e instanceof Error ? e.message : "Lỗi xác thực / phân quyền");
        setLoading(false);
      }
    }

    run();
    return () => {
      mounted = false;
    };
  }, [router]);

  const visibleLinks = useMemo(() => links.filter((l) => canAccess(role, l.href)), [role]);

  useEffect(() => {
    if (!supabase) return;
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        authCache = null;
        sessionStorage.removeItem("nails.auth.cache");
      }
    });
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!loading && !canAccess(role, pathname)) {
      router.replace(visibleLinks[0]?.href ?? "/");
    }
  }, [loading, pathname, role, router, visibleLinks]);

  async function onLogout() {
    if (!supabase) return;
    await supabase.auth.signOut();
    authCache = null;
    sessionStorage.removeItem("nails.auth.cache");
    router.replace("/login");
  }

  if (loading) {
    return <div className="p-8 text-sm text-neutral-600">Đang kiểm tra đăng nhập...</div>;
  }

  if (authError) {
    return (
      <div className="space-y-3 p-8 text-sm">
        <p className="font-semibold text-red-600">Không thể xác thực phiên đăng nhập.</p>
        <p className="text-neutral-700">Chi tiết: {authError}</p>
        <button
          onClick={() => router.replace("/login")}
          className="rounded border px-3 py-2 text-xs"
        >
          Về trang login
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 p-4">
          <div>
            <p className="text-xs text-neutral-500">Nails App</p>
            <h1 className="text-lg font-semibold">MVP Sprint 2</h1>
          </div>

          <nav className="flex flex-wrap gap-2 text-sm">
            {visibleLinks.map((l) => {
              const active = pathname === l.href;
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`rounded-lg px-3 py-2 ${active ? "bg-neutral-900 text-white" : "text-neutral-700 hover:bg-neutral-100"}`}
                >
                  {l.label}
                </Link>
              );
            })}
          </nav>

          <div className="text-right text-xs">
            <p className="text-neutral-500">{email || "No session"}</p>
            <p className="font-semibold">{role}</p>
            <button onClick={onLogout} className="mt-1 rounded border px-2 py-1 text-xs">
              Logout
            </button>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-6xl p-6">{children}</div>
    </div>
  );
}
