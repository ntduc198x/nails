"use client";

import { AppShell } from "@/components/app-shell";
import { getCurrentSessionRole, type AppRole } from "@/lib/auth";
import { ensureOrgContext } from "@/lib/domain";
import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";

type Entry = {
  id: string;
  staff_user_id: string;
  clock_in: string;
  clock_out: string | null;
};

export default function ShiftsPage() {
  const [role, setRole] = useState<AppRole | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      setLoading(true);
      setError(null);
      if (!supabase) throw new Error("Thiếu cấu hình Supabase");

      const r = await getCurrentSessionRole();
      setRole(r);
      const { orgId } = await ensureOrgContext();

      const { data, error } = await supabase
        .from("time_entries")
        .select("id,staff_user_id,clock_in,clock_out")
        .eq("org_id", orgId)
        .order("clock_in", { ascending: false })
        .limit(50);

      if (error) throw error;
      setEntries((data ?? []) as Entry[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load shifts failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function clockIn() {
    try {
      setError(null);
      if (!supabase) throw new Error("Thiếu cấu hình Supabase");
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;
      if (!user) throw new Error("Chưa đăng nhập");
      const { orgId } = await ensureOrgContext();

      const { error } = await supabase.from("time_entries").insert({
        org_id: orgId,
        staff_user_id: user.id,
        clock_in: new Date().toISOString(),
      });
      if (error) throw error;
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Clock in failed");
    }
  }

  async function clockOut() {
    try {
      setError(null);
      if (!supabase) throw new Error("Thiếu cấu hình Supabase");
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;
      if (!user) throw new Error("Chưa đăng nhập");

      const { data: openRows, error: findErr } = await supabase
        .from("time_entries")
        .select("id")
        .eq("staff_user_id", user.id)
        .is("clock_out", null)
        .order("clock_in", { ascending: false })
        .limit(1);
      if (findErr) throw findErr;

      const id = openRows?.[0]?.id;
      if (!id) throw new Error("Không có ca đang mở để clock out");

      const { error } = await supabase
        .from("time_entries")
        .update({ clock_out: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Clock out failed");
    }
  }

  const canUse = role === "OWNER" || role === "MANAGER" || role === "RECEPTION" || role === "TECH";

  return (
    <AppShell>
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Ca làm / Chấm công</h2>
        {canUse ? (
          <div className="flex gap-2">
            <button onClick={clockIn} className="rounded bg-neutral-900 px-4 py-2 text-sm text-white">
              Clock in
            </button>
            <button onClick={clockOut} className="rounded border px-4 py-2 text-sm">
              Clock out
            </button>
          </div>
        ) : (
          <p className="text-sm text-amber-700">Role hiện tại không được chấm công.</p>
        )}

        <div className="rounded-2xl bg-white p-5 shadow-sm">
          {error && <p className="mb-3 text-sm text-red-600">Lỗi: {error}</p>}
          {loading ? (
            <p className="text-sm text-neutral-500">Đang tải...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-neutral-500">
                  <tr>
                    <th className="py-2">Staff</th>
                    <th>Clock in</th>
                    <th>Clock out</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((e) => (
                    <tr key={e.id} className="border-t border-neutral-100">
                      <td className="py-2">{e.staff_user_id}</td>
                      <td>{new Date(e.clock_in).toLocaleString("vi-VN")}</td>
                      <td>{e.clock_out ? new Date(e.clock_out).toLocaleString("vi-VN") : "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
