"use client";

import { AppShell } from "@/components/app-shell";
import { getDashboardSnapshot } from "@/lib/reporting";
import { formatVnd } from "@/lib/mock-data";
import { useEffect, useState } from "react";

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [data, setData] = useState({
    appointmentsToday: 0,
    waiting: 0,
    active: 0,
    revenue: 0,
    closedCount: 0,
  });

  async function load() {
    try {
      setError(null);
      const snapshot = await getDashboardSnapshot();
      setData(snapshot);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load dashboard failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(() => {
      load();
    }, 20000);
    return () => clearInterval(id);
  }, [autoRefresh]);

  const cards = [
    { label: "Lịch hẹn hôm nay", value: String(data.appointmentsToday) },
    { label: "Khách đang chờ", value: String(data.waiting) },
    { label: "Đang phục vụ", value: String(data.active) },
    { label: "Doanh thu hôm nay", value: formatVnd(data.revenue) },
  ];

  return (
    <AppShell>
      <div className="space-y-5">
        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-2xl font-bold">Dashboard vận hành</h2>
              <p className="mt-1 text-sm text-neutral-600">Snapshot hôm nay · auto refresh mỗi 20 giây.</p>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <button onClick={load} className="rounded border px-3 py-2">Refresh</button>
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

        <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {cards.map((item) => (
            <div key={item.label} className="rounded-2xl bg-white p-4 shadow-sm">
              <p className="text-sm text-neutral-500">{item.label}</p>
              <p className="mt-2 text-xl font-semibold">{loading ? "..." : item.value}</p>
            </div>
          ))}
        </section>

        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold">Tổng bill closed hôm nay</h3>
          <p className="mt-2 text-3xl font-bold">{loading ? "..." : data.closedCount}</p>
        </section>
      </div>
    </AppShell>
  );
}
