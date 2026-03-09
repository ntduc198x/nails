"use client";

import { AppShell } from "@/components/app-shell";
import { getDashboardSnapshot } from "@/lib/reporting";
import { formatVnd } from "@/lib/mock-data";
import { useCallback, useEffect, useRef, useState } from "react";

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>("-");
  const hasLoadedRef = useRef(false);
  const [data, setData] = useState({
    appointmentsToday: 0,
    waiting: 0,
    active: 0,
    revenue: 0,
    closedCount: 0,
  });

  const load = useCallback(async (opts?: { force?: boolean }) => {
    const isInitial = !hasLoadedRef.current;
    try {
      if (!isInitial) setRefreshing(true);
      setError(null);
      const snapshot = await getDashboardSnapshot({ force: opts?.force });
      setData(snapshot);
      setLastUpdated(new Date().toLocaleTimeString("vi-VN"));
      hasLoadedRef.current = true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load dashboard failed");
    } finally {
      if (isInitial) setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load({ force: true });
  }, [load]);

  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(() => {
      void load();
    }, 20000);
    return () => clearInterval(id);
  }, [autoRefresh, load]);

  const avgBill = data.closedCount > 0 ? data.revenue / data.closedCount : 0;
  const totalFlow = Math.max(data.appointmentsToday, 1);
  const waitingPct = Math.min(100, Math.round((data.waiting / totalFlow) * 100));
  const activePct = Math.min(100, Math.round((data.active / totalFlow) * 100));
  const doneApprox = Math.max(0, data.appointmentsToday - data.waiting - data.active);
  const donePct = Math.min(100, Math.round((doneApprox / totalFlow) * 100));

  const cards = [
    { label: "Lịch hẹn hôm nay", value: String(data.appointmentsToday) },
    { label: "Khách đang chờ", value: String(data.waiting) },
    { label: "Đang phục vụ", value: String(data.active) },
    { label: "Doanh thu hôm nay", value: formatVnd(data.revenue) },
    { label: "Bill trung bình", value: formatVnd(avgBill) },
  ];

  return (
    <AppShell>
      <div className="space-y-5">
        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-2xl font-bold">Dashboard vận hành</h2>
              <p className="mt-1 text-sm text-neutral-600">Snapshot hôm nay · auto refresh mỗi 20 giây.</p>
              <p className="mt-1 text-xs text-neutral-500">Cập nhật lúc: {lastUpdated}</p>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <button
                onClick={() => void load({ force: true })}
                disabled={refreshing}
                className="rounded border px-3 py-2 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {refreshing ? "Đang refresh..." : "Refresh"}
              </button>
              <button
                onClick={() => setAutoRefresh((v) => !v)}
                className={`rounded px-3 py-2 ${autoRefresh ? "bg-neutral-900 text-white" : "border"}`}
              >
                {autoRefresh ? "Auto: ON" : "Auto: OFF"}
              </button>
            </div>
          </div>
          {error && <p className="mt-2 text-sm text-red-600">Lỗi: {error}</p>}
        </section>

        <section className="grid grid-cols-2 gap-3 md:grid-cols-5">
          {cards.map((item) => (
            <div key={item.label} className="rounded-2xl bg-white p-4 shadow-sm">
              <p className="text-sm text-neutral-500">{item.label}</p>
              <p className="mt-2 text-xl font-semibold">{loading ? "..." : item.value}</p>
            </div>
          ))}
        </section>

        <section className="grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <h3 className="text-lg font-semibold">Phân bổ trạng thái lịch hẹn</h3>
            <div className="mt-4 space-y-3 text-sm">
              <div>
                <div className="mb-1 flex justify-between"><span>Đang chờ</span><span>{waitingPct}%</span></div>
                <div className="h-2 rounded bg-neutral-100"><div className="h-2 rounded bg-amber-400" style={{ width: `${waitingPct}%` }} /></div>
              </div>
              <div>
                <div className="mb-1 flex justify-between"><span>Đang phục vụ</span><span>{activePct}%</span></div>
                <div className="h-2 rounded bg-neutral-100"><div className="h-2 rounded bg-blue-500" style={{ width: `${activePct}%` }} /></div>
              </div>
              <div>
                <div className="mb-1 flex justify-between"><span>Đã xử lý</span><span>{donePct}%</span></div>
                <div className="h-2 rounded bg-neutral-100"><div className="h-2 rounded bg-emerald-500" style={{ width: `${donePct}%` }} /></div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <h3 className="text-lg font-semibold">Hiệu suất thanh toán hôm nay</h3>
            <div className="mt-4 space-y-2">
              <p className="text-sm text-neutral-500">Tổng bill closed</p>
              <p className="text-3xl font-bold">{loading ? "..." : data.closedCount}</p>
              <p className="mt-3 text-sm text-neutral-500">Doanh thu / bill trung bình</p>
              <p className="text-lg font-semibold">{loading ? "..." : `${formatVnd(data.revenue)} / ${formatVnd(avgBill)}`}</p>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
