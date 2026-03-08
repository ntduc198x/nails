"use client";

import { AppShell } from "@/components/app-shell";
import { listRecentTickets } from "@/lib/domain";
import { formatVnd } from "@/lib/mock-data";
import { useEffect, useMemo, useState } from "react";

type TicketRow = {
  id: string;
  status: string;
  created_at: string;
  totals_json?: { subtotal?: number; vat_total?: number; grand_total?: number };
};

export default function ReportsPage() {
  const [rows, setRows] = useState<TicketRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load(force = false) {
    try {
      setError(null);
      setLoading(true);
      const data = await listRecentTickets({ force });
      setRows(data as TicketRow[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load reports failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const summary = useMemo(() => {
    const closed = rows.filter((r) => r.status === "CLOSED");
    const revenue = closed.reduce((acc, r) => acc + Number(r.totals_json?.grand_total ?? 0), 0);
    const vat = closed.reduce((acc, r) => acc + Number(r.totals_json?.vat_total ?? 0), 0);
    const subtotal = closed.reduce((acc, r) => acc + Number(r.totals_json?.subtotal ?? 0), 0);
    return { count: closed.length, revenue, vat, subtotal };
  }, [rows]);

  return (
    <AppShell>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Báo cáo nhanh</h2>
          <button className="rounded border px-3 py-2 text-sm" onClick={() => load(true)}>
            Refresh
          </button>
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
