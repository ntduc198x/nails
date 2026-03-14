"use client";

import { AppShell } from "@/components/app-shell";
import { getCurrentSessionRole, listUserRoles, type AppRole } from "@/lib/auth";
import { ensureOrgContext } from "@/lib/domain";
import { supabase } from "@/lib/supabase";
import { useCallback, useEffect, useMemo, useState } from "react";

type Entry = {
  id: string;
  staff_user_id: string;
  clock_in: string;
  clock_out: string | null;
};

type StaffProfile = { user_id: string; display_name: string | null };

export default function ShiftsPage() {
  const [role, setRole] = useState<AppRole | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [staffProfiles, setStaffProfiles] = useState<StaffProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const loadEntries = useCallback(async (targetOrgId: string) => {
    const isInitial = entries.length === 0;
    try {
      if (isInitial) setLoading(true);
      else setRefreshing(true);
      setError(null);

      const { data, error } = await supabase
        .from("time_entries")
        .select("id,staff_user_id,clock_in,clock_out")
        .eq("org_id", targetOrgId)
        .order("clock_in", { ascending: false })
        .limit(30);

      if (error) throw error;
      const rows = (data ?? []) as Entry[];
      setEntries(rows);

      const ids = [...new Set(rows.map((r) => r.staff_user_id))];
      if (ids.length) {
        const teamRows = await listUserRoles();
        const profiles = teamRows
          .filter((r) => ids.includes(r.user_id as string))
          .map((r) => ({ user_id: r.user_id as string, display_name: (r.display_name as string | null) ?? null }));
        setStaffProfiles(profiles as StaffProfile[]);
      } else {
        setStaffProfiles([]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load shifts failed");
    } finally {
      if (isInitial) setLoading(false);
      else setRefreshing(false);
    }
  }, [entries.length]);

  useEffect(() => {
    async function init() {
      try {
        if (!supabase) throw new Error("Thiếu cấu hình Supabase");
        const { data } = await supabase.auth.getSession();
        const currentUserId = data.session?.user?.id;
        if (!currentUserId) throw new Error("Chưa đăng nhập");

        const [r, ctx] = await Promise.all([getCurrentSessionRole(), ensureOrgContext()]);
        setRole(r);
        setUserId(currentUserId);
        setOrgId(ctx.orgId);
        await loadEntries(ctx.orgId);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Khởi tạo shifts failed");
        setLoading(false);
      }
    }

    void init();
  }, [loadEntries]);

  async function clockIn() {
    if (!orgId || !userId || submitting) return;

    try {
      setSubmitting(true);
      setError(null);
      if (!supabase) throw new Error("Thiếu cấu hình Supabase");

      const { error } = await supabase.from("time_entries").insert({
        org_id: orgId,
        staff_user_id: userId,
        clock_in: new Date().toISOString(),
      });
      if (error) throw error;
      await loadEntries(orgId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Clock in failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function clockOut() {
    if (!orgId || !userId || submitting) return;

    try {
      setSubmitting(true);
      setError(null);
      if (!supabase) throw new Error("Thiếu cấu hình Supabase");

      const { data: openRows, error: findErr } = await supabase
        .from("time_entries")
        .select("id")
        .eq("org_id", orgId)
        .eq("staff_user_id", userId)
        .is("clock_out", null)
        .order("clock_in", { ascending: false })
        .limit(1);
      if (findErr) throw findErr;

      const id = openRows?.[0]?.id;
      if (!id) throw new Error("Không có ca đang mở để clock out");

      const { error } = await supabase
        .from("time_entries")
        .update({ clock_out: new Date().toISOString() })
        .eq("id", id)
        .eq("org_id", orgId);
      if (error) throw error;
      await loadEntries(orgId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Clock out failed");
    } finally {
      setSubmitting(false);
    }
  }

  const canUse = role === "OWNER" || role === "MANAGER" || role === "RECEPTION" || role === "TECH";
  const openCount = useMemo(() => entries.filter((e) => !e.clock_out).length, [entries]);

  return (
    <AppShell>
      <div className="page-shell">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="page-title">Ca làm / Chấm công</h2>
          {refreshing && <span className="text-xs text-neutral-500">Đang làm mới...</span>}
          <span className="rounded-full bg-neutral-100 px-2 py-1 text-xs text-neutral-700">Đang mở: {openCount}</span>
        </div>
        {canUse ? (
          <div className="flex gap-2">
            <button
              onClick={clockIn}
              disabled={submitting}
              className="btn btn-primary"
            >
              {submitting ? "Đang xử lý..." : "Clock in"}
            </button>
            <button
              onClick={clockOut}
              disabled={submitting}
              className="btn btn-outline disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Đang xử lý..." : "Clock out"}
            </button>
          </div>
        ) : (
          <p className="text-sm text-amber-700">Role hiện tại không được chấm công.</p>
        )}

        <div className="card">
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
                  {entries.map((e) => {
                    const staffName = staffProfiles.find((p) => p.user_id === e.staff_user_id)?.display_name || e.staff_user_id;
                    return (
                      <tr key={e.id} className="border-t border-neutral-100">
                        <td className="py-2">{staffName}</td>
                        <td>{new Date(e.clock_in).toLocaleString("vi-VN")}</td>
                        <td>{e.clock_out ? new Date(e.clock_out).toLocaleString("vi-VN") : "-"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
