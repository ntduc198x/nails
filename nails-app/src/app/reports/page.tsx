"use client";

import { AppShell } from "@/components/app-shell";
import { listUserRoles } from "@/lib/auth";
import { getReportBreakdown, getStaffRevenueInRange, listTicketsInRange, listTimeEntriesInRange, type ReportTicketRow } from "@/lib/reporting";
import { formatVnd } from "@/lib/mock-data";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

function toDateInput(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows.map((r) => r.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ReportsPage() {
  const today = new Date();
  const [fromDate, setFromDate] = useState(toDateInput(today));
  const [toDate, setToDate] = useState(toDateInput(new Date(today.getTime() + 24 * 60 * 60 * 1000)));
  const [staffFilter, setStaffFilter] = useState<string>("ALL");

  const [rows, setRows] = useState<ReportTicketRow[]>([]);
  const [breakdown, setBreakdown] = useState<{
    summary: { count: number; subtotal: number; vat: number; revenue: number };
    by_service: Array<{ service_name: string; qty: number; subtotal: number }>;
    by_payment: Array<{ method: string; count: number; amount: number }>;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [breakdownError, setBreakdownError] = useState<string | null>(null);
  const [staffHours, setStaffHours] = useState<Array<{ staff: string; minutes: number; entries: number }>>([]);
  const [staffRevenue, setStaffRevenue] = useState<Array<{ staffUserId: string; staff: string; revenue: number; tickets: number }>>([]);

  const load = useCallback(async () => {
    const isInitial = rows.length === 0;
    try {
      setError(null);
      setBreakdownError(null);
      if (isInitial) setLoading(true);
      else setRefreshing(true);

      const fromIso = new Date(`${fromDate}T00:00:00`).toISOString();
      const toIso = new Date(`${toDate}T00:00:00`).toISOString();

      const data = await listTicketsInRange(fromIso, toIso);
      setRows(data);

      try {
        const [summaryData, timeRows, teamRows, staffRevenueRows] = await Promise.all([
          getReportBreakdown(fromIso, toIso),
          listTimeEntriesInRange(fromIso, toIso),
          listUserRoles(),
          getStaffRevenueInRange(fromIso, toIso),
        ]);

        setBreakdown(summaryData);
        setStaffRevenue(staffRevenueRows);

        const nameMap = new Map(
          ((teamRows ?? []) as Array<{ user_id: string; display_name?: string }>).map((r: { user_id: string; display_name?: string }) => [
            r.user_id,
            r.display_name || String(r.user_id).slice(0, 8),
          ]),
        );

        const map = new Map<string, { minutes: number; entries: number }>();
        for (const r of timeRows as Array<{ staff_user_id: string; clock_in: string; clock_out: string | null }>) {
          const key = nameMap.get(r.staff_user_id) ?? r.staff_user_id;
          const start = new Date(r.clock_in).getTime();
          const end = r.clock_out ? new Date(r.clock_out).getTime() : Date.now();
          const mins = Math.max(0, Math.round((end - start) / 60000));
          const prev = map.get(key) ?? { minutes: 0, entries: 0 };
          map.set(key, { minutes: prev.minutes + mins, entries: prev.entries + 1 });
        }

        setStaffHours(
          Array.from(map.entries())
            .map(([staff, v]) => ({ staff, minutes: v.minutes, entries: v.entries }))
            .sort((a, b) => b.minutes - a.minutes),
        );
      } catch (e) {
        setBreakdown(null);
        setBreakdownError(e instanceof Error ? e.message : "Breakdown RPC failed");
        setStaffHours([]);
        setStaffRevenue([]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load reports failed");
    } finally {
      if (isInitial) setLoading(false);
      else setRefreshing(false);
    }
  }, [fromDate, toDate, rows.length]);

  useEffect(() => {
    void load();
  }, [load]);

  const summary = useMemo(() => {
    if (breakdown?.summary) {
      return {
        count: Number(breakdown.summary.count ?? 0),
        revenue: Number(breakdown.summary.revenue ?? 0),
        vat: Number(breakdown.summary.vat ?? 0),
        subtotal: Number(breakdown.summary.subtotal ?? 0),
      };
    }

    const closed = rows.filter((r) => r.status === "CLOSED");
    const revenue = closed.reduce((acc, r) => acc + Number(r.totals_json?.grand_total ?? 0), 0);
    const vat = closed.reduce((acc, r) => acc + Number(r.totals_json?.vat_total ?? 0), 0);
    const subtotal = closed.reduce((acc, r) => acc + Number(r.totals_json?.subtotal ?? 0), 0);
    return { count: closed.length, revenue, vat, subtotal };
  }, [rows, breakdown]);

  const revenueByStaffTotal = useMemo(() => staffRevenue.reduce((sum, row) => sum + row.revenue, 0), [staffRevenue]);
  const staffNameMap = useMemo(() => new Map(staffRevenue.map((row) => [row.staffUserId, row.staff])), [staffRevenue]);
  const filteredTicketRows = useMemo(() => {
    if (staffFilter === "ALL") return rows;
    return rows.filter((row) => row.staff_user_id === staffFilter);
  }, [rows, staffFilter]);

  function exportCsv() {
    const rowsOut: string[][] = [];
    rowsOut.push(["SUMMARY"]);
    rowsOut.push(["count", String(summary.count)]);
    rowsOut.push(["subtotal", String(summary.subtotal)]);
    rowsOut.push(["vat", String(summary.vat)]);
    rowsOut.push(["revenue", String(summary.revenue)]);
    rowsOut.push([]);

    rowsOut.push(["BY_SERVICE"]);
    rowsOut.push(["service_name", "qty", "subtotal"]);
    for (const s of breakdown?.by_service ?? []) rowsOut.push([s.service_name, String(s.qty), String(s.subtotal)]);
    rowsOut.push([]);

    rowsOut.push(["BY_PAYMENT"]);
    rowsOut.push(["method", "count", "amount"]);
    for (const p of breakdown?.by_payment ?? []) rowsOut.push([p.method, String(p.count), String(p.amount)]);
    rowsOut.push([]);

    rowsOut.push(["BY_STAFF_HOURS"]);
    rowsOut.push(["staff", "entries", "minutes"]);
    for (const s of staffHours) rowsOut.push([s.staff, String(s.entries), String(s.minutes)]);
    rowsOut.push([]);

    rowsOut.push(["BY_STAFF_REVENUE"]);
    rowsOut.push(["staff_user_id", "staff_name", "tickets", "revenue"]);
    for (const s of staffRevenue) rowsOut.push([s.staffUserId, s.staff, String(s.tickets), String(s.revenue)]);
    rowsOut.push([]);

    rowsOut.push(["TICKETS"]);
    rowsOut.push(["ticket_id", "staff_user_id", "created_at", "status", "subtotal", "vat", "grand_total"]);
    for (const r of filteredTicketRows) {
      rowsOut.push([
        r.id,
        r.staff_user_id ?? "",
        new Date(r.created_at).toISOString(),
        r.status,
        String(Number(r.totals_json?.subtotal ?? 0)),
        String(Number(r.totals_json?.vat_total ?? 0)),
        String(Number(r.totals_json?.grand_total ?? 0)),
      ]);
    }

    downloadCsv(`nails-report-${fromDate}-to-${toDate}.csv`, rowsOut);
  }

  return (
    <AppShell>
      <div className="page-shell">
        <div className="card">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="page-title">Báo cáo nhanh</h2>
              <p className="page-subtitle">Tổng quan doanh thu, breakdown và hiệu quả theo từng nhân viên.</p>
            </div>
            {refreshing && <span className="badge-soft">Đang làm mới...</span>}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <input className="input" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            <span className="text-sm text-neutral-500">đến</span>
            <input className="input" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            <select className="input" value={staffFilter} onChange={(e) => setStaffFilter(e.target.value)}>
              <option value="ALL">Tất cả nhân viên</option>
              {staffRevenue.map((row) => (
                <option key={row.staffUserId} value={row.staffUserId}>{row.staff}</option>
              ))}
            </select>
            <button className="btn btn-outline" onClick={() => void load()} disabled={refreshing}>{refreshing ? "Đang lọc..." : "Lọc"}</button>
            <button className="btn btn-primary" onClick={exportCsv}>Export CSV</button>
          </div>
        </div>

        <div className="page-grid md:grid-cols-4">
          <div className="card"><p className="text-sm text-neutral-500">Số bill CLOSED</p><p className="text-xl font-semibold">{summary.count}</p></div>
          <div className="card"><p className="text-sm text-neutral-500">Subtotal</p><p className="text-xl font-semibold">{formatVnd(summary.subtotal)}</p></div>
          <div className="card"><p className="text-sm text-neutral-500">VAT</p><p className="text-xl font-semibold">{formatVnd(summary.vat)}</p></div>
          <div className="card"><p className="text-sm text-neutral-500">Doanh thu</p><p className="text-xl font-semibold">{formatVnd(summary.revenue)}</p></div>
        </div>

        {breakdownError && <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">Breakdown nâng cao đang lỗi: {breakdownError}. Vẫn hiển thị danh sách ticket cơ bản bình thường.</div>}

        <div className="page-grid md:grid-cols-4">
          <div className="card">
            <h3 className="mb-2 font-semibold">Top dịch vụ</h3>
            <div className="table-wrap"><table className="table"><thead className="text-neutral-500"><tr><th className="py-2">Dịch vụ</th><th>SL</th><th>Subtotal</th></tr></thead><tbody>{(breakdown?.by_service ?? []).map((s, idx) => <tr key={`${s.service_name}-${idx}`} className="border-t border-neutral-100"><td className="py-2">{s.service_name}</td><td>{s.qty}</td><td>{formatVnd(Number(s.subtotal ?? 0))}</td></tr>)}</tbody></table></div>
          </div>

          <div className="card">
            <h3 className="mb-2 font-semibold">Theo phương thức thanh toán</h3>
            <div className="table-wrap"><table className="table"><thead className="text-neutral-500"><tr><th className="py-2">Method</th><th>Số bill</th><th>Số tiền</th></tr></thead><tbody>{(breakdown?.by_payment ?? []).map((p, idx) => <tr key={`${p.method}-${idx}`} className="border-t border-neutral-100"><td className="py-2">{p.method}</td><td>{p.count}</td><td>{formatVnd(Number(p.amount ?? 0))}</td></tr>)}</tbody></table></div>
          </div>

          <div className="card">
            <h3 className="mb-2 font-semibold">Theo nhân viên (giờ làm)</h3>
            <div className="table-wrap"><table className="table"><thead className="text-neutral-500"><tr><th className="py-2">Nhân viên</th><th>Số ca</th><th>Phút</th></tr></thead><tbody>{staffHours.map((s, idx) => <tr key={`${s.staff}-${idx}`} className="border-t border-neutral-100"><td className="py-2">{s.staff}</td><td>{s.entries}</td><td>{s.minutes}</td></tr>)}</tbody></table></div>
          </div>

          <div className="card">
            <div className="mb-2 flex items-center justify-between gap-2"><h3 className="font-semibold">Doanh thu theo nhân viên</h3><span className="text-xs text-neutral-500">{formatVnd(revenueByStaffTotal)}</span></div>
            <div className="table-wrap"><table className="table"><thead className="text-neutral-500"><tr><th className="py-2">Nhân viên</th><th>Số bill</th><th>Doanh thu</th></tr></thead><tbody>{staffRevenue.map((s) => <tr key={s.staffUserId} className="border-t border-neutral-100"><td className="py-2">{s.staff}</td><td>{s.tickets}</td><td>{formatVnd(s.revenue)}</td></tr>)}</tbody></table></div>
          </div>
        </div>

        <div className="card">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div>
              <h3 className="font-semibold">Bill chi tiết theo nhân viên</h3>
              <p className="text-sm text-neutral-500">Lọc theo nhân viên để xem từng bill ai đã xử lý.</p>
            </div>
            <span className="text-xs text-neutral-500">{filteredTicketRows.length} bill</span>
          </div>
          {error && <p className="mb-3 text-sm text-red-600">Lỗi: {error}</p>}
          {loading ? (
            <div className="space-y-2"><div className="skeleton h-10 rounded-xl" /><div className="skeleton h-10 rounded-xl" /><div className="skeleton h-10 rounded-xl" /></div>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead className="text-neutral-500"><tr><th className="py-2">Thời gian</th><th>Nhân viên</th><th>Trạng thái</th><th>Subtotal</th><th>VAT</th><th>Tổng</th><th></th></tr></thead>
                <tbody>
                  {filteredTicketRows.map((t) => (
                    <tr key={t.id} className="border-t border-neutral-100">
                      <td className="py-2">{new Date(t.created_at).toLocaleString("vi-VN")}</td>
                      <td>{t.staff_user_id ? (staffNameMap.get(t.staff_user_id) ?? t.staff_user_id.slice(0, 8)) : "-"}</td>
                      <td>{t.status}</td>
                      <td>{formatVnd(Number(t.totals_json?.subtotal ?? 0))}</td>
                      <td>{formatVnd(Number(t.totals_json?.vat_total ?? 0))}</td>
                      <td>{formatVnd(Number(t.totals_json?.grand_total ?? 0))}</td>
                      <td><Link className="underline" href={`/reports/${t.id}`}>Chi tiết</Link></td>
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
