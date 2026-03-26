"use client";

import { AppShell } from "@/components/app-shell";
import { getCurrentSessionRole } from "@/lib/auth";
import { ensureOrgContext, listStaffMembers, updateAppointmentStatus } from "@/lib/domain";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type RangeMode = "day" | "week" | "month";

type AppointmentRow = {
  id: string;
  start_at: string;
  end_at: string;
  status: string;
  staff_user_id: string | null;
  resource_id: string | null;
  customers?: { name?: string } | { name?: string }[] | null;
};

type ResourceRow = { id: string; name: string };
type StaffRow = { user_id: string; display_name: string };
type OpenTicketRow = { id: string; appointment_id: string | null; status: string };

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function startOfWeek(date: Date) {
  const d = startOfDay(date);
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  return d;
}

function endOfWeek(date: Date) {
  const d = startOfWeek(date);
  d.setDate(d.getDate() + 6);
  d.setHours(23, 59, 59, 999);
  return d;
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

function pickCustomerName(customers: AppointmentRow["customers"]) {
  if (Array.isArray(customers)) return customers[0]?.name ?? "-";
  return customers?.name ?? "-";
}

function statusTone(status: string) {
  if (status === "CHECKED_IN") return "bg-emerald-50 text-emerald-700";
  if (status === "BOOKED") return "bg-amber-50 text-amber-700";
  if (status === "DONE") return "bg-slate-100 text-slate-700";
  return "bg-neutral-100 text-neutral-600";
}

export default function TechnicianBoardPage() {
  const [rows, setRows] = useState<AppointmentRow[]>([]);
  const [resources, setResources] = useState<ResourceRow[]>([]);
  const [staffs, setStaffs] = useState<StaffRow[]>([]);
  const [openTickets, setOpenTickets] = useState<OpenTicketRow[]>([]);
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [selectedStaffId, setSelectedStaffId] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "BOOKED" | "CHECKED_IN" | "DONE">("ALL");
  const [rangeMode, setRangeMode] = useState<RangeMode>("day");
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load(opts?: { silent?: boolean }) {
    try {
      if (!opts?.silent) setLoading(true);
      setError(null);
      if (!supabase) throw new Error("Thiếu cấu hình Supabase");

      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user?.id;
      if (!userId) throw new Error("Chưa đăng nhập");
      setMyUserId(userId);

      const currentRole = await getCurrentSessionRole();
      setRole(currentRole);

      const { orgId } = await ensureOrgContext();
      const now = new Date();
      const range = rangeMode === "day"
        ? { start: startOfDay(now), end: endOfDay(now) }
        : rangeMode === "week"
          ? { start: startOfWeek(now), end: endOfWeek(now) }
          : { start: startOfMonth(now), end: endOfMonth(now) };

      const [appointmentsRes, resourcesRes, ticketsRes, staffRows] = await Promise.all([
        supabase
          .from("appointments")
          .select("id,start_at,end_at,status,staff_user_id,resource_id,customers(name)")
          .eq("org_id", orgId)
          .or(`and(status.eq.BOOKED,start_at.lte.${range.end.toISOString()}),and(status.eq.CHECKED_IN,start_at.lte.${range.end.toISOString()}),and(status.eq.DONE,start_at.gte.${range.start.toISOString()},start_at.lte.${range.end.toISOString()})`)
          .order("start_at", { ascending: true }),
        supabase.from("resources").select("id,name").eq("org_id", orgId).eq("active", true),
        supabase.from("tickets").select("id,appointment_id,status").eq("org_id", orgId).eq("status", "OPEN"),
        listStaffMembers(),
      ]);

      if (appointmentsRes.error) throw appointmentsRes.error;
      if (resourcesRes.error) throw resourcesRes.error;
      if (ticketsRes.error) throw ticketsRes.error;

      setRows((appointmentsRes.data ?? []) as AppointmentRow[]);
      setResources((resourcesRes.data ?? []) as ResourceRow[]);
      setStaffs(((staffRows ?? []) as Array<{ userId: string; name: string }>).map((s) => ({ user_id: s.userId, display_name: s.name })) as StaffRow[]);
      setOpenTickets((ticketsRes.data ?? []) as OpenTicketRow[]);
      setSelectedStaffId((prev) => (currentRole === "TECH" ? prev || userId : prev));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load technician board failed");
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [rangeMode]);

  useEffect(() => {
    const id = setInterval(() => {
      void load({ silent: true });
    }, 30000);
    return () => clearInterval(id);
  }, [rangeMode]);

  const visibleStaffId = role === "TECH" ? myUserId ?? "" : selectedStaffId;

  const filteredRows = useMemo(() => {
    const byStaff = !visibleStaffId ? rows : rows.filter((r) => r.staff_user_id === visibleStaffId);
    if (statusFilter === "ALL") return byStaff;
    return byStaff.filter((r) => r.status === statusFilter);
  }, [rows, visibleStaffId, statusFilter]);

  const booked = filteredRows.filter((r) => r.status === "BOOKED");
  const active = filteredRows.filter((r) => r.status === "CHECKED_IN");
  const done = filteredRows.filter((r) => r.status === "DONE");

  const timelineRows = useMemo(() => [...filteredRows].sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime()), [filteredRows]);

  const resourceName = (id: string | null) => resources.find((r) => r.id === id)?.name ?? "-";
  const staffName = (id: string | null) => staffs.find((s) => s.user_id === id)?.display_name ?? "-";
  const openTicketForAppointment = (appointmentId: string) => openTickets.find((t) => t.appointment_id === appointmentId);
  const canSwitchStaff = role === "OWNER" || role === "MANAGER" || role === "RECEPTION";

  async function onAdvanceStatus(row: AppointmentRow) {
    if (actingId) return;
    try {
      setActingId(row.id);
      if (row.status === "BOOKED") {
        if (role === "TECH") {
          if (!supabase) throw new Error("Thiếu cấu hình Supabase");
          const { error } = await supabase.rpc("tech_check_in_appointment_secure", { p_appointment_id: row.id });
          if (error) throw error;
        } else {
          await updateAppointmentStatus(row.id, "CHECKED_IN");
        }
      }
      await load({ silent: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update technician board failed");
    } finally {
      setActingId(null);
    }
  }

  return (
    <AppShell>
      <div className="page-shell">
        <section className="card">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="page-title">Techboard hôm nay</h2>
              <p className="page-subtitle">Theo dõi khách đang chờ, đang làm và đã xong của từng thợ.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {canSwitchStaff ? (
                <select className="input" value={selectedStaffId} onChange={(e) => setSelectedStaffId(e.target.value)}>
                  <option value="">-- Chọn thợ --</option>
                  {staffs.map((s) => <option key={s.user_id} value={s.user_id}>{s.display_name || s.user_id.slice(0, 8)}</option>)}
                </select>
              ) : (
                <span className="badge-soft">{staffName(myUserId)}</span>
              )}
              <select className="input" value={rangeMode} onChange={(e) => setRangeMode(e.target.value as RangeMode)}>
                <option value="day">Trong ngày</option>
                <option value="week">Trong tuần</option>
                <option value="month">Trong tháng</option>
              </select>
              <select className="input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}>
                <option value="ALL">Tất cả</option>
                <option value="BOOKED">Khách chờ</option>
                <option value="CHECKED_IN">Đang phục vụ</option>
                <option value="DONE">Đã xong</option>
              </select>
            </div>
          </div>
          {error && <p className="mt-3 text-sm text-red-600">Lỗi: {error}</p>}
          <div className="mt-4 flex flex-wrap gap-2">
            <a href="/manage/appointments" className="rounded-full border border-[#eadfce] bg-[#f6efe6] px-4 py-2 text-sm transition hover:bg-[var(--color-primary)] hover:text-white">Appointments</a>
            <a href="/manage/checkout" className="rounded-full border border-[#eadfce] bg-[#f6efe6] px-4 py-2 text-sm transition hover:bg-[var(--color-primary)] hover:text-white">Checkout</a>
            <a href="/manage/shifts" className="rounded-full border border-[#eadfce] bg-[#f6efe6] px-4 py-2 text-sm transition hover:bg-[var(--color-primary)] hover:text-white">Ca làm</a>
          </div>
        </section>

        <section className="page-grid md:grid-cols-3">
          {[{ title: "Khách đang chờ", rows: booked }, { title: "Đang phục vụ", rows: active }, { title: "Đã xong", rows: done }].map((group) => (
            <div key={group.title} className="card">
              <div className="flex items-center justify-between"><h3 className="text-lg font-semibold">{group.title}</h3><span className="badge-soft">{group.rows.length}</span></div>
              <div className="mt-4 stack-tight">
                {loading ? (
                  <><div className="skeleton h-20 rounded-2xl" /><div className="skeleton h-20 rounded-2xl" /></>
                ) : group.rows.length ? (
                  group.rows.map((row) => (
                    <div key={row.id} className="rounded-2xl border border-neutral-100 px-4 py-3">
                      <div className="flex items-center justify-between gap-3"><p className="font-semibold">{pickCustomerName(row.customers)}</p><span className={`rounded-full px-3 py-1 text-xs font-medium ${statusTone(row.status)}`}>{row.status}</span></div>
                      <div className="mt-2 text-sm text-neutral-500"><p>{new Date(row.start_at).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })} - {new Date(row.end_at).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}</p><p>Ghế/Bàn: {resourceName(row.resource_id)}</p></div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {row.status === "BOOKED" && (
                          <button className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-medium text-white transition hover:bg-emerald-700" disabled={actingId === row.id} onClick={() => void onAdvanceStatus(row)}>
                            {actingId === row.id ? "Đang xử lý..." : "Start / Check-in"}
                          </button>
                        )}
                        {row.status === "CHECKED_IN" && (
                          <Link href={`/manage/checkout?appointmentId=${row.id}&customer=${encodeURIComponent(pickCustomerName(row.customers))}`} className="rounded-lg border border-[#eadfce] bg-[#f6efe6] px-3 py-1 text-xs font-medium transition hover:bg-[var(--color-primary)] hover:text-white">Checkout</Link>
                        )}
                      </div>
                    </div>
                  ))
                ) : <p className="text-sm text-neutral-500">Không có dữ liệu.</p>}
              </div>
            </div>
          ))}
        </section>

        <section className="card">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold">Timeline</h3>
              <p className="page-subtitle mt-0">Xem lịch theo thứ tự giờ để tránh sót khách và chồng ca.</p>
            </div>
            <span className="badge-soft">{timelineRows.length} lịch</span>
          </div>
          <div className="mt-4 stack-tight">
            {loading ? (
              <><div className="skeleton h-16 rounded-2xl" /><div className="skeleton h-16 rounded-2xl" /><div className="skeleton h-16 rounded-2xl" /></>
            ) : timelineRows.length ? (
              timelineRows.map((row) => (
                <div key={`timeline-${row.id}`} className="grid gap-2 rounded-2xl border border-neutral-100 px-4 py-3 md:grid-cols-[120px_1fr_180px_120px] md:items-center">
                  <p className="font-semibold">{new Date(row.start_at).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}<span className="ml-2 text-neutral-400">→</span><span className="ml-2">{new Date(row.end_at).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}</span></p>
                  <p>{pickCustomerName(row.customers)}</p>
                  <p className="text-neutral-500">Ghế/Bàn: {resourceName(row.resource_id)}</p>
                  <div className="flex justify-start md:justify-end"><span className={`rounded-full px-3 py-1 text-xs font-medium ${statusTone(row.status)}`}>{row.status}</span></div>
                </div>
              ))
            ) : <p className="text-sm text-neutral-500">Không có lịch trong bộ lọc hiện tại.</p>}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
