"use client";

import { AppShell } from "@/components/app-shell";
import { getOrCreateRole, listUserRoles, type AppRole, updateUserRoleByRowId } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";

type UserRoleRow = { id: string; user_id: string; role: AppRole };

const roleOptions: AppRole[] = ["OWNER", "MANAGER", "RECEPTION", "ACCOUNTANT", "TECH"];

export default function TeamPage() {
  const [rows, setRows] = useState<UserRoleRow[]>([]);
  const [myRole, setMyRole] = useState<AppRole>("RECEPTION");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const canManage = myRole === "OWNER" || myRole === "MANAGER";

  async function load() {
    try {
      setLoading(true);
      setError(null);
      if (!supabase) throw new Error("Thiếu cấu hình Supabase env");

      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;
      if (!user) throw new Error("Chưa đăng nhập");

      const role = await getOrCreateRole(user.id);
      setMyRole(role);

      const roleRows = await listUserRoles();
      setRows(roleRows as UserRoleRow[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load team failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function onChangeRole(id: string, role: AppRole) {
    try {
      setError(null);
      await updateUserRoleByRowId(id, role);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update role failed");
    }
  }

  return (
    <AppShell>
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Nhân sự & Role (Supabase)</h2>
        <p className="text-sm text-neutral-600">Role của bạn: <b>{myRole}</b></p>

        <div className="card">
          {error && <p className="mb-3 text-sm text-red-600">Lỗi: {error}</p>}
          {loading ? (
            <p className="text-sm text-neutral-500">Đang tải...</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {rows.map((m) => (
                <li key={m.id} className="flex items-center justify-between rounded-lg border border-neutral-100 p-3">
                  <div>
                    <p className="font-medium">{m.user_id}</p>
                    <p className="text-xs text-neutral-500">row id: {m.id}</p>
                  </div>

                  {canManage ? (
                    <select
                      value={m.role}
                      onChange={(e) => onChangeRole(m.id, e.target.value as AppRole)}
                      className="btn btn-outline px-2 py-1 text-xs"
                    >
                      {roleOptions.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs">{m.role}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </AppShell>
  );
}
