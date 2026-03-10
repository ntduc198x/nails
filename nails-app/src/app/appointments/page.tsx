"use client";

import { AppShell } from "@/components/app-shell";
import { createAppointment, listAppointments, listStaffMembers, updateAppointmentStatus } from "@/lib/domain";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type AppointmentRow = {
  id: string;
  start_at: string;
  end_at: string;
  status: string;
  staff_user_id?: string | null;
  customers?: { name: string } | { name: string }[] | null;
};

type StaffOption = { userId: string; name: string };

function toInputValue(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function statusBadge(status: string) {
  if (status === "BOOKED") return "bg-slate-100 text-slate-700";
  if (status === "CHECKED_IN") return "bg-blue-100 text-blue-700";
  if (status === "DONE") return "bg-emerald-100 text-emerald-700";
  if (status === "CANCELLED") return "bg-red-100 text-red-700";
  if (status === "NO_SHOW") return "bg-amber-100 text-amber-700";
  return "bg-neutral-100 text-neutral-700";
}

export default function AppointmentsPage() {
  const now = new Date();
  const [customerName, setCustomerName] = useState("");
  const [startAt, setStartAt] = useState(toInputValue(now));
  const [endAt, setEndAt] = useState(toInputValue(new Date(now.getTime() + 60 * 60 * 1000)));
  const [staffUserId, setStaffUserId] = useState("");

  const [rows, setRows] = useState<AppointmentRow[]>([]);
  const [staffOptions, setStaffOptions] = useState<StaffOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [submitting, setSubmitting] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const load = useCallback(async (opts?: { force?: boolean }) => {
    const isInitial = rows.length === 0;
    try {
      if (isInitial) setLoading(true);
      else setRefreshing(true);
      setError(null);
      const [data, staffs] = await Promise.all([
        listAppointments({ force: opts?.force }),
        listStaffMembers(),
      ]);
      setRows(data as AppointmentRow[]);
      setStaffOptions(staffs as StaffOption[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load appointments failed");
    } finally {
      if (isInitial) setLoading(false);
      else setRefreshing(false);
    }
  }, [rows.length]);

  useEffect(() => {
    void load({ force: true });
  }, [load]);

  const filteredRows = useMemo(() => {
    if (statusFilter === "ALL") return rows;
    return rows.filter((r) => r.status === statusFilter);
  }, [rows, statusFilter]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;

    try {
      setSubmitting(true);
      setError(null);
      await createAppointment({
        customerName,
        startAt: new Date(startAt).toISOString(),
        endAt: new Date(endAt).toISOString(),
        staffUserId: staffUserId || null,
      });
      setCustomerName("");
      setStaffUserId("");
      await load({ force: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create appointment failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function onQuickStatus(id: string, status: "CHECKED_IN" | "CANCELLED") {
    if (updatingId) return;

    try {
      setUpdatingId(id);
      setError(null);
      await updateAppointmentStatus(id, status);
      await load({ force: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update appointment status failed");
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <AppShell>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold">Appointments (Supabase)</h2>
            {refreshing && <span className="text-xs text-neutral-500">Đang làm mới...</span>}
          </div>
          <select
            className="input"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="BOOKED">BOOKED</option>
            <option value="CHECKED_IN">CHECKED_IN</option>
            <option value="DONE">DONE</option>
            <option value="CANCELLED">CANCELLED</option>
            <option value="NO_SHOW">NO_SHOW</option>
          </select>
        </div>

        <form onSubmit={onSubmit} className="grid gap-3 card md:grid-cols-5">
          <input
            className="input"
            placeholder="Tên khách"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            disabled={submitting}
            required
          />
          <input
            className="input"
            type="datetime-local"
            value={startAt}
            onChange={(e) => setStartAt(e.target.value)}
            disabled={submitting}
            required
          />
          <input
            className="input"
            type="datetime-local"
            value={endAt}
            onChange={(e) => setEndAt(e.target.value)}
            disabled={submitting}
            required
          />
          <select
            className="input"
            value={staffUserId}
            onChange={(e) => setStaffUserId(e.target.value)}
            disabled={submitting}
          >
            <option value="">-- Chọn thợ (tuỳ chọn) --</option>
            {staffOptions.map((s) => (
              <option key={s.userId} value={s.userId}>
                {s.name}
              </option>
            ))}
          </select>
          <button
            className="btn btn-primary"
            disabled={submitting}
          >
            {submitting ? "Đang tạo..." : "Tạo lịch hẹn"}
          </button>
        </form>

        <div className="card">
          {error && <p className="mb-3 text-sm text-red-600">Lỗi: {error}</p>}
          {loading ? (
            <p className="text-sm text-neutral-500">Đang tải...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-neutral-500">
                  <tr>
                    <th className="py-2">Bắt đầu</th>
                    <th>Kết thúc</th>
                    <th>Khách</th>
                    <th>Thợ</th>
                    <th>Trạng thái</th>
                    <th>Quick action</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((a) => {
                    const customer = Array.isArray(a.customers)
                      ? a.customers[0]?.name
                      : a.customers?.name;
                    const staffName = staffOptions.find((s) => s.userId === a.staff_user_id)?.name;
                    return (
                      <tr key={a.id} className="border-t border-neutral-100">
                        <td className="py-2">{new Date(a.start_at).toLocaleString("vi-VN")}</td>
                        <td>{new Date(a.end_at).toLocaleString("vi-VN")}</td>
                        <td>{customer ?? "-"}</td>
                        <td>{staffName ?? "-"}</td>
                        <td>
                          <span className={`rounded-full px-2 py-1 text-xs font-medium ${statusBadge(a.status)}`}>{a.status}</span>
                        </td>
                        <td className="space-x-1">
                          {a.status === "BOOKED" && (
                            <button
                              onClick={() => onQuickStatus(a.id, "CHECKED_IN")}
                              className="btn btn-outline px-2 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-60"
                              disabled={!!updatingId}
                            >
                              {updatingId === a.id ? "Đang xử lý..." : "Check-in"}
                            </button>
                          )}
                          {["BOOKED", "CHECKED_IN"].includes(a.status) && (
                            <button
                              onClick={() => onQuickStatus(a.id, "CANCELLED")}
                              className="btn btn-outline px-2 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-60"
                              disabled={!!updatingId}
                            >
                              {updatingId === a.id ? "Đang xử lý..." : "Cancel"}
                            </button>
                          )}
                        </td>
                        <td>
                          {["BOOKED", "CHECKED_IN"].includes(a.status) ? (
                            <Link
                              href={`/checkout?customer=${encodeURIComponent(customer ?? "")}&appointmentId=${a.id}`}
                              className="btn btn-outline px-2 py-1 text-xs"
                            >
                              Open ticket
                            </Link>
                          ) : (
                            <span className="text-xs text-neutral-400">Closed</span>
                          )}
                        </td>
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
