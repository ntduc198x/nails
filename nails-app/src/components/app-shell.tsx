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
  { href: "/team", label: "Nhân sự" },
];

function canAccess(role: AppRole, href: string) {
  if (role === "OWNER" || role === "MANAGER") return true;
  if (role === "RECEPTION") return ["/", "/appointments", "/checkout"].includes(href);
  if (role === "TECH") return ["/", "/appointments"].includes(href);
  if (role === "ACCOUNTANT") return ["/", "/checkout"].includes(href);
  return false;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string>("");
  const [role, setRole] = useState<AppRole>("RECEPTION");

  useEffect(() => {
    let mounted = true;

    async function run() {
      if (!supabase) {
        setLoading(false);
        return;
      }

      const { data } = await supabase.auth.getSession();
      const session = data.session;

      if (!session?.user) {
        router.replace("/login");
        return;
      }

      const userRole = await getOrCreateRole(session.user.id);
      if (!mounted) return;
      setEmail(session.user.email ?? "");
      setRole(userRole);
      setLoading(false);
    }

    run();
    return () => {
      mounted = false;
    };
  }, [router]);

  const visibleLinks = useMemo(() => links.filter((l) => canAccess(role, l.href)), [role]);

  useEffect(() => {
    if (!loading && !canAccess(role, pathname)) {
      router.replace(visibleLinks[0]?.href ?? "/");
    }
  }, [loading, pathname, role, router, visibleLinks]);

  async function onLogout() {
    if (!supabase) return;
    await supabase.auth.signOut();
    router.replace("/login");
  }

  if (loading) {
    return <div className="p-8 text-sm text-neutral-600">Đang kiểm tra đăng nhập...</div>;
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
