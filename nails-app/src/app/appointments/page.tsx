"use client";

import { AppShell } from "@/components/app-shell";
import { createAppointment, listAppointments } from "@/lib/domain";
import Link from "next/link";
import { useEffect, useState } from "react";

type AppointmentRow = {
  id: string;
  start_at: string;
  end_at: string;
  status: string;
  customers?: { name: string } | { name: string }[] | null;
};

function toInputValue(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function AppointmentsPage() {
  const now = new Date();
  const [customerName, setCustomerName] = useState("");
  const [startAt, setStartAt] = useState(toInputValue(now));
  const [endAt, setEndAt] = useState(toInputValue(new Date(now.getTime() + 60 * 60 * 1000)));

  const [rows, setRows] = useState<AppointmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      setLoading(true);
      setError(null);
      const data = await listAppointments();
      setRows(data as AppointmentRow[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load appointments failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      setError(null);
      await createAppointment({
        customerName,
        startAt: new Date(startAt).toISOString(),
        endAt: new Date(endAt).toISOString(),
      });
      setCustomerName("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create appointment failed");
    }
  }

  return (
    <AppShell>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Appointments (Supabase)</h2>
        </div>

        <form onSubmit={onSubmit} className="grid gap-3 rounded-2xl bg-white p-4 shadow-sm md:grid-cols-4">
          <input
            className="rounded-lg border px-3 py-2"
            placeholder="Tên khách"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            required
          />
          <input
            className="rounded-lg border px-3 py-2"
            type="datetime-local"
            value={startAt}
            onChange={(e) => setStartAt(e.target.value)}
            required
          />
          <input
            className="rounded-lg border px-3 py-2"
            type="datetime-local"
            value={endAt}
            onChange={(e) => setEndAt(e.target.value)}
            required
          />
          <button className="rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white">Tạo lịch hẹn</button>
        </form>

        <div className="rounded-2xl bg-white p-5 shadow-sm">
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
                    <th>Trạng thái</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((a) => {
                    const customer = Array.isArray(a.customers)
                      ? a.customers[0]?.name
                      : a.customers?.name;
                    return (
                      <tr key={a.id} className="border-t border-neutral-100">
                        <td className="py-2">{new Date(a.start_at).toLocaleString("vi-VN")}</td>
                        <td>{new Date(a.end_at).toLocaleString("vi-VN")}</td>
                        <td>{customer ?? "-"}</td>
                        <td>{a.status}</td>
                        <td>
                          <Link
                            href={`/checkout?customer=${encodeURIComponent(customer ?? "")}`}
                            className="rounded border px-2 py-1 text-xs"
                          >
                            Open ticket
                          </Link>
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
