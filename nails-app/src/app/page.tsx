"use client";

import { AppShell } from "@/components/app-shell";
import { getDashboardSnapshot, getReportBreakdown } from "@/lib/reporting";
import { formatVnd } from "@/lib/mock-data";
import { useCallback, useEffect, useRef, useState } from "react";

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>("-");
  const hasLoadedRef = useRef(false);
  const [topServices, setTopServices] = useState<Array<{ service_name: string; qty: number; subtotal: number }>>([]);
  const [data, setData] = useState({
    appointmentsToday: 0,
    waiting: 0,
    active: 0,
    revenue: 0,
    closedCount: 0,
    checkingInCustomers: [] as string[],
    waitingSchedule: [] as Array<{ time: string; customer: string; staff: string }>,
  });

  const load = useCallback(async (opts?: { force?: boolean }) => {
    const isInitial = !hasLoadedRef.current;
    try {
      if (!isInitial) setRefreshing(true);
      setError(null);
      const now = new Date();
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);

      const [snapshot, breakdown] = await Promise.all([
        getDashboardSnapshot({ force: opts?.force }),
        getReportBreakdown(start.toISOString(), end.toISOString()),
      ]);

      setData(snapshot);
      setTopServices((breakdown.by_service ?? []).slice(0, 3));
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
        <section className="card">
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
                className="btn btn-outline"
              >
                {refreshing ? "Đang refresh..." : "Refresh"}
              </button>
              <button
                onClick={() => setAutoRefresh((v) => !v)}
                className={`btn ${autoRefresh ? "btn-primary" : "btn-outline"}`}
              >
                {autoRefresh ? "Auto: ON" : "Auto: OFF"}
              </button>
            </div>
          </div>
          {error && <p className="mt-2 text-sm text-red-600">Lỗi: {error}</p>}
        </section>

        <section className="grid grid-cols-2 gap-3 md:grid-cols-5">
          {cards.map((item) => (
            <div key={item.label} className="card">
              <p className="text-sm text-neutral-500">{item.label}</p>
              <p className="mt-2 text-xl font-semibold">{loading ? "..." : item.value}</p>
            </div>
          ))}
        </section>

        <section className="grid gap-3 md:grid-cols-2">
          <div className="card">
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

          <div className="card">
            <h3 className="text-lg font-semibold">Hiệu suất thanh toán hôm nay</h3>
            <div className="mt-4 space-y-2">
              <p className="text-sm text-neutral-500">Tổng bill closed</p>
              <p className="text-3xl font-bold">{loading ? "..." : data.closedCount}</p>
              <p className="mt-3 text-sm text-neutral-500">Doanh thu / bill trung bình</p>
              <p className="text-lg font-semibold">{loading ? "..." : `${formatVnd(data.revenue)} / ${formatVnd(avgBill)}`}</p>

              <p className="mt-4 text-sm text-neutral-500">Khách đang check-in</p>
              {loading ? (
                <p className="text-sm">...</p>
              ) : data.checkingInCustomers.length ? (
                <div className="flex flex-wrap gap-2">
                  {data.checkingInCustomers.map((name, idx) => (
                    <span key={`${name}-${idx}`} className="rounded-full bg-red-50 px-3 py-1 text-xs text-red-700">
                      {name}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-neutral-500">Chưa có khách check-in.</p>
              )}
            </div>
          </div>
        </section>

        <section className="grid gap-3 md:grid-cols-2">
          <div className="card">
            <h3 className="text-lg font-semibold">Top dịch vụ hôm nay</h3>
            <div className="mt-4 space-y-2 text-sm">
              {topServices.length === 0 ? (
                <p className="text-neutral-500">Chưa có dữ liệu dịch vụ hôm nay.</p>
              ) : (
                topServices.map((s, idx) => (
                  <div key={`${s.service_name}-${idx}`} className="flex items-center justify-between rounded-lg border border-neutral-100 px-3 py-2">
                    <div>
                      <p className="font-medium">{s.service_name}</p>
                      <p className="text-xs text-neutral-500">SL: {s.qty}</p>
                    </div>
                    <p className="font-semibold">{formatVnd(Number(s.subtotal))}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold">Lịch khách chờ theo thợ (hôm nay)</h3>
            <div className="mt-4 space-y-2 text-sm">
              {data.waitingSchedule.length === 0 ? (
                <p className="text-neutral-500">Hiện chưa có lịch chờ.</p>
              ) : (
                data.waitingSchedule.map((item, idx) => (
                  <div key={`${item.time}-${item.customer}-${idx}`} className="grid grid-cols-3 items-center rounded-lg border border-neutral-100 px-3 py-2">
                    <p className="font-medium">{item.time}</p>
                    <p>{item.customer}</p>
                    <p className="text-right text-neutral-500">{item.staff}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
