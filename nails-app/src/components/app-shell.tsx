"use client";

import { getOrCreateRole, type AppRole } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

const navGroups = [
  {
    label: "Dashboard",
    href: "/",
    items: [{ href: "/", label: "Dashboard", desc: "Tổng quan vận hành trong ngày" }],
  },
  {
    label: "Vận hành",
    items: [
      { href: "/appointments", label: "Appointments", desc: "Lịch hẹn, check-in, phân thợ" },
      { href: "/checkout", label: "Checkout", desc: "Ticket, thanh toán, receipt" },
      { href: "/technician", label: "Technician", desc: "Board công việc theo thợ" },
      { href: "/shifts", label: "Ca làm", desc: "Chấm công và ca trong ngày" },
    ],
  },
  {
    label: "Thiết lập",
    items: [
      { href: "/services", label: "Dịch vụ", desc: "Menu dịch vụ và VAT" },
      { href: "/resources", label: "Ghế/Bàn", desc: "Quản lý chair, table, room" },
      { href: "/team", label: "Nhân sự", desc: "Role và nhân sự" },
    ],
  },
  {
    label: "Báo cáo",
    items: [
      { href: "/reports", label: "Reports", desc: "Doanh thu và breakdown" },
      { href: "/tax-books", label: "Sổ thuế", desc: "Mẫu S1a xuất file" },
    ],
  },
] as const;

function canAccess(role: AppRole, href: string) {
  if (role === "OWNER") return true;
  if (role === "MANAGER") return href !== "/tax-books";
  if (role === "RECEPTION") return ["/", "/appointments", "/resources", "/checkout", "/shifts", "/technician"].includes(href);
  if (role === "TECH") return ["/", "/appointments", "/shifts", "/technician"].includes(href);
  if (role === "ACCOUNTANT") return ["/", "/checkout", "/reports", "/tax-books"].includes(href);
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
  const [mobileOpen, setMobileOpen] = useState(false);

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

  const visibleGroups = useMemo(() => {
    return navGroups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => canAccess(role, item.href)),
      }))
      .filter((group) => group.items.length > 0);
  }, [role]);

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
    // Prefetch các route được phép để chuyển trang mượt hơn
    for (const group of visibleGroups) {
      for (const item of group.items) {
        router.prefetch(item.href);
      }
    }
  }, [router, visibleGroups]);

  useEffect(() => {
    if (!loading && !canAccess(role, pathname)) {
      router.replace(visibleGroups[0]?.items[0]?.href ?? "/");
    }
  }, [loading, pathname, role, router, visibleGroups]);

  useEffect(() => {
    document.body.classList.add("motion-ready");
    const targets = Array.from(document.querySelectorAll(".card, .page-title, .table-wrap"));
    targets.forEach((el) => el.classList.add("reveal-on-scroll"));

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
            io.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.08, rootMargin: "0px 0px -8% 0px" },
    );

    targets.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [pathname]);

  async function onLogout() {
    if (!supabase) return;
    await supabase.auth.signOut();
    authCache = null;
    sessionStorage.removeItem("nails.auth.cache");
    router.replace("/login");
  }

  if (loading) {
    return <div className="p-8 text-sm" style={{ color: "var(--color-text-secondary)" }}>Đang kiểm tra đăng nhập...</div>;
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
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 backdrop-blur" style={{ borderBottom: "1px solid var(--color-border)", background: "rgba(255,253,249,.95)" }}>
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 p-3 md:p-4">
          <div>
            <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>Nails App</p>
            <h1 className="text-lg font-semibold">MVP Sprint 2</h1>
          </div>

          <nav className="hidden items-center gap-2 text-sm md:flex">
            {visibleGroups.map((group) => {
              const active = group.items.some((item) => item.href === pathname);
              const directHref = group.href ?? group.items[0]?.href ?? "/";

              if (group.items.length === 1) {
                return (
                  <Link
                    key={group.label}
                    href={directHref}
                    className="rounded-full px-4 py-2 text-sm transition"
                    style={active ? { background: "var(--color-primary)", color: "#fff" } : { color: "var(--color-text-secondary)" }}
                  >
                    {group.label}
                  </Link>
                );
              }

              return (
                <div key={group.label} className="group relative">
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm transition"
                    style={active ? { background: "var(--color-primary)", color: "#fff" } : { color: "var(--color-text-secondary)" }}
                  >
                    <span>{group.label}</span>
                    <span className="text-xs opacity-80">▾</span>
                  </button>
                  <div className="pointer-events-none absolute left-0 top-full z-30 pt-3 opacity-0 transition duration-150 group-hover:pointer-events-auto group-hover:opacity-100">
                    <div className="w-[380px] rounded-[28px] border bg-white p-3 shadow-xl" style={{ borderColor: "var(--color-border)" }}>
                      <div className="grid gap-2">
                        {group.items.map((item) => {
                          const itemActive = pathname === item.href;
                          return (
                            <Link
                              key={item.href}
                              href={item.href}
                              className="rounded-2xl px-4 py-3 transition hover:bg-[#faf7f2]"
                              style={itemActive ? { background: "#fff1f3" } : undefined}
                            >
                              <p className="text-sm font-semibold" style={{ color: itemActive ? "var(--color-primary)" : "var(--color-text-main)" }}>{item.label}</p>
                              <p className="mt-1 text-xs" style={{ color: "var(--color-text-secondary)" }}>{item.desc}</p>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </nav>

          <button className="btn btn-outline md:hidden" type="button" onClick={() => setMobileOpen((v) => !v)}>
            Menu
          </button>

          <div className="hidden text-right text-xs md:block">
            <p style={{ color: "var(--color-text-secondary)" }}>{email || "No session"}</p>
            <p className="font-semibold">{role}</p>
            <button onClick={onLogout} className="btn btn-outline mt-1 px-2 py-1 text-xs">
              Logout
            </button>
          </div>
        </div>
        {mobileOpen && (
          <div className="mx-auto max-w-7xl border-t px-3 pb-3 pt-2 md:hidden" style={{ borderColor: "var(--color-border)" }}>
            <div className="space-y-3">
              {visibleGroups.map((group) => (
                <details key={group.label} className="rounded-2xl border bg-white p-3" style={{ borderColor: "var(--color-border)" }}>
                  <summary className="cursor-pointer list-none text-sm font-semibold">{group.label}</summary>
                  <div className="mt-3 grid gap-2">
                    {group.items.map((item) => (
                      <Link key={item.href} href={item.href} className="rounded-xl px-3 py-2 hover:bg-[#faf7f2]" onClick={() => setMobileOpen(false)}>
                        <p className="text-sm font-semibold">{item.label}</p>
                        <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>{item.desc}</p>
                      </Link>
                    ))}
                  </div>
                </details>
              ))}
              <div className="rounded-2xl border bg-white p-3 text-xs" style={{ borderColor: "var(--color-border)" }}>
                <p style={{ color: "var(--color-text-secondary)" }}>{email || "No session"}</p>
                <p className="font-semibold">{role}</p>
                <button onClick={onLogout} className="btn btn-outline mt-2 px-2 py-1 text-xs">Logout</button>
              </div>
            </div>
          </div>
        )}
      </header>
      <div className="mx-auto max-w-7xl p-6">{children}</div>
    </div>
  );
}
