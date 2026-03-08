"use client";

import { AppShell } from "@/components/app-shell";
import { getReportBreakdown, listTicketsInRange, type ReportTicketRow } from "@/lib/reporting";
import { formatVnd } from "@/lib/mock-data";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

function toDateInput(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows
    .map((r) => r.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(","))
    .join("\n");
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

  const [rows, setRows] = useState<ReportTicketRow[]>([]);
  const [breakdown, setBreakdown] = useState<{
    summary: { count: number; subtotal: number; vat: number; revenue: number };
    by_service: Array<{ service_name: string; qty: number; subtotal: number }>;
    by_payment: Array<{ method: string; count: number; amount: number }>;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [breakdownError, setBreakdownError] = useState<string | null>(null);

  async function load() {
    try {
      setError(null);
      setBreakdownError(null);
      setLoading(true);
      const fromIso = new Date(`${fromDate}T00:00:00`).toISOString();
      const toIso = new Date(`${toDate}T00:00:00`).toISOString();

      // Core list luôn ưu tiên chạy trước
      const data = await listTicketsInRange(fromIso, toIso);
      setRows(data);

      // Breakdown là phần nâng cao, lỗi thì degrade graceful
      try {
        const summaryData = await getReportBreakdown(fromIso, toIso);
        setBreakdown(summaryData);
      } catch (e) {
        setBreakdown(null);
        setBreakdownError(e instanceof Error ? e.message : "Breakdown RPC failed");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load reports failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  function exportCsv() {
    const header = ["ticket_id", "created_at", "status", "subtotal", "vat", "grand_total"];
    const body = rows.map((r) => [
      r.id,
      new Date(r.created_at).toISOString(),
      r.status,
      Number(r.totals_json?.subtotal ?? 0),
      Number(r.totals_json?.vat_total ?? 0),
      Number(r.totals_json?.grand_total ?? 0),
    ]);
    downloadCsv(`nails-report-${fromDate}-to-${toDate}.csv`, [header, ...body] as string[][]);
  }

  return (
    <AppShell>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-2xl font-bold">Báo cáo nhanh</h2>
          <div className="flex flex-wrap items-center gap-2">
            <input className="rounded border px-2 py-1 text-sm" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            <span className="text-sm text-neutral-500">đến</span>
            <input className="rounded border px-2 py-1 text-sm" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            <button className="rounded border px-3 py-2 text-sm" onClick={load}>Lọc</button>
            <button className="rounded border px-3 py-2 text-sm" onClick={exportCsv}>Export CSV</button>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <div className="rounded-xl bg-white p-4 shadow-sm">
            <p className="text-sm text-neutral-500">Số bill CLOSED</p>
            <p className="text-xl font-semibold">{summary.count}</p>
          </div>
          <div className="rounded-xl bg-white p-4 shadow-sm">
            <p className="text-sm text-neutral-500">Subtotal</p>
            <p className="text-xl font-semibold">{formatVnd(summary.subtotal)}</p>
          </div>
          <div className="rounded-xl bg-white p-4 shadow-sm">
            <p className="text-sm text-neutral-500">VAT</p>
            <p className="text-xl font-semibold">{formatVnd(summary.vat)}</p>
          </div>
          <div className="rounded-xl bg-white p-4 shadow-sm">
            <p className="text-sm text-neutral-500">Doanh thu</p>
            <p className="text-xl font-semibold">{formatVnd(summary.revenue)}</p>
          </div>
        </div>

        {breakdownError && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            Breakdown nâng cao đang lỗi: {breakdownError}. Vẫn hiển thị danh sách ticket cơ bản bình thường.
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <h3 className="mb-2 font-semibold">Top dịch vụ</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-neutral-500">
                  <tr>
                    <th className="py-2">Dịch vụ</th>
                    <th>SL</th>
                    <th>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {(breakdown?.by_service ?? []).map((s, idx) => (
                    <tr key={`${s.service_name}-${idx}`} className="border-t border-neutral-100">
                      <td className="py-2">{s.service_name}</td>
                      <td>{s.qty}</td>
                      <td>{formatVnd(Number(s.subtotal ?? 0))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <h3 className="mb-2 font-semibold">Theo phương thức thanh toán</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-neutral-500">
                  <tr>
                    <th className="py-2">Method</th>
                    <th>Số bill</th>
                    <th>Số tiền</th>
                  </tr>
                </thead>
                <tbody>
                  {(breakdown?.by_payment ?? []).map((p, idx) => (
                    <tr key={`${p.method}-${idx}`} className="border-t border-neutral-100">
                      <td className="py-2">{p.method}</td>
                      <td>{p.count}</td>
                      <td>{formatVnd(Number(p.amount ?? 0))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm">
          {error && <p className="mb-3 text-sm text-red-600">Lỗi: {error}</p>}
          {loading ? (
            <p className="text-sm text-neutral-500">Đang tải...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-neutral-500">
                  <tr>
                    <th className="py-2">Thời gian</th>
                    <th>Trạng thái</th>
                    <th>Subtotal</th>
                    <th>VAT</th>
                    <th>Tổng</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((t) => (
                    <tr key={t.id} className="border-t border-neutral-100">
                      <td className="py-2">{new Date(t.created_at).toLocaleString("vi-VN")}</td>
                      <td>{t.status}</td>
                      <td>{formatVnd(Number(t.totals_json?.subtotal ?? 0))}</td>
                      <td>{formatVnd(Number(t.totals_json?.vat_total ?? 0))}</td>
                      <td>{formatVnd(Number(t.totals_json?.grand_total ?? 0))}</td>
                      <td>
                        <Link className="underline" href={`/reports/${t.id}`}>
                          Chi tiết
                        </Link>
                      </td>
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
