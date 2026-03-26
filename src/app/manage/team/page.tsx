"use client";

import { AppShell } from "@/components/app-shell";
import { getOrCreateRole, listUserRoles, type AppRole, updateUserDisplayName, updateUserRoleByRowId } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";

type UserRoleRow = { id: string; user_id: string; role: AppRole; display_name?: string };

const roleOptions: AppRole[] = ["MANAGER", "RECEPTION", "ACCOUNTANT", "TECH"];

export default function TeamPage() {
  const [rows, setRows] = useState<UserRoleRow[]>([]);
  const [myRole, setMyRole] = useState<AppRole>("RECEPTION");
  const [loading, setLoading] = useState(true);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const canManage = myRole === "OWNER";

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

  async function onSaveName(userId: string) {
    try {
      setError(null);
      await updateUserDisplayName(userId, editingName.trim() || "User");
      setEditingUserId(null);
      await load();
    } catch (e) {
      if (e instanceof Error) setError(e.message);
      else if (e && typeof e === "object") {
        const anyErr = e as { message?: unknown; details?: unknown; hint?: unknown };
        setError([anyErr.message, anyErr.details, anyErr.hint].filter(Boolean).join(" | ") || "Update name failed");
      } else {
        setError("Update name failed");
      }
    }
  }

  return (
    <AppShell>
      <div className="page-shell">
        <h2 className="page-title">Nhân sự & Role</h2>
        <p className="text-sm text-neutral-600">Role của bạn: <b>{myRole}</b>. Chỉ OWNER được đổi role nhân sự khác.</p>

        <div className="card">
          {error && <p className="mb-3 text-sm text-red-600">Lỗi: {error}</p>}
          {loading ? (
            <p className="text-sm text-neutral-500">Đang tải...</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {rows.map((m) => (
                <li key={m.id} className="flex items-center justify-between rounded-lg border border-neutral-100 p-3">
                  <div className="min-w-0 flex-1">
                    {editingUserId === m.user_id ? (
                      <div className="flex gap-2">
                        <input className="input w-full" value={editingName} onChange={(e) => setEditingName(e.target.value)} />
                        <button className="btn btn-primary" type="button" onClick={() => void onSaveName(m.user_id)}>Lưu</button>
                        <button className="btn btn-outline" type="button" onClick={() => setEditingUserId(null)}>Huỷ</button>
                      </div>
                    ) : (
                      <>
                        <p className="font-medium">{m.display_name || m.user_id}</p>
                        <p className="text-xs text-neutral-500">row id: {m.id}</p>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {canManage && editingUserId !== m.user_id && (
                      <button
                        type="button"
                        className="btn btn-outline px-2 py-1 text-xs"
                        onClick={() => {
                          setEditingUserId(m.user_id);
                          setEditingName(m.display_name || "");
                        }}
                      >
                        Sửa tên
                      </button>
                    )}
                    {canManage && m.role !== "OWNER" ? (
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
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </AppShell>
  );
}
