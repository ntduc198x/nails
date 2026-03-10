"use client";

import { AppShell } from "@/components/app-shell";
import { getCurrentSessionRole, type AppRole } from "@/lib/auth";
import { createService, listServices } from "@/lib/domain";
import { formatVnd } from "@/lib/mock-data";
import { useCallback, useEffect, useState } from "react";

type ServiceRow = {
  id: string;
  name: string;
  duration_min: number;
  base_price: number;
  vat_rate: number;
  active: boolean;
};

export default function ServicesPage() {
  const [rows, setRows] = useState<ServiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);

  const [name, setName] = useState("");
  const [duration, setDuration] = useState(45);
  const [price, setPrice] = useState(250000);
  const [vat, setVat] = useState(8);

  const load = useCallback(async (opts?: { force?: boolean }) => {
    const isInitial = rows.length === 0;
    try {
      if (isInitial) setLoading(true);
      else setRefreshing(true);
      setError(null);
      const currentRole = await getCurrentSessionRole();
      setRole(currentRole);
      const data = await listServices({ force: opts?.force });
      setRows(data as ServiceRow[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load services failed");
    } finally {
      if (isInitial) setLoading(false);
      else setRefreshing(false);
    }
  }, [rows.length]);

  useEffect(() => {
    void load({ force: true });
  }, [load]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;

    try {
      setSubmitting(true);
      setError(null);
      if (role !== "OWNER" && role !== "MANAGER" && role !== "RECEPTION") {
        throw new Error("Role hiện tại không được phép thêm dịch vụ.");
      }
      await createService({
        name,
        durationMin: duration,
        basePrice: price,
        vatPercent: vat,
      });
      setName("");
      setDuration(45);
      setPrice(250000);
      setVat(8);
      await load({ force: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create service failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppShell>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold">Dịch vụ & VAT (Supabase)</h2>
            {refreshing && <span className="text-xs text-neutral-500">Đang làm mới...</span>}
          </div>
        </div>
        {role === "ACCOUNTANT" || role === "TECH" ? (
          <p className="text-sm text-amber-700">Role hiện tại chỉ xem danh sách dịch vụ, không thêm/sửa.</p>
        ) : null}

        <form onSubmit={onSubmit} className="grid gap-3 card md:grid-cols-5">
          <input
            className="input md:col-span-2"
            placeholder="Tên dịch vụ"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <input
            className="input"
            type="number"
            min={5}
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            placeholder="Duration (phút)"
            required
          />
          <input
            className="input"
            type="number"
            min={0}
            value={price}
            onChange={(e) => setPrice(Number(e.target.value))}
            placeholder="Giá"
            required
          />
          <div className="flex gap-2">
            <input
              className="w-full input"
              type="number"
              min={0}
              step={0.5}
              value={vat}
              onChange={(e) => setVat(Number(e.target.value))}
              placeholder="VAT %"
              required
            />
            <button
              disabled={submitting || role === "ACCOUNTANT" || role === "TECH"}
              className="btn btn-primary"
            >
              {submitting ? "Đang thêm..." : "Thêm"}
            </button>
          </div>
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
                    <th className="py-2">Tên</th>
                    <th>Duration</th>
                    <th>Giá</th>
                    <th>VAT</th>
                    <th>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((s) => (
                    <tr key={s.id} className="border-t border-neutral-100">
                      <td className="py-2">{s.name}</td>
                      <td>{s.duration_min} phút</td>
                      <td>{formatVnd(Number(s.base_price))}</td>
                      <td>{Number(s.vat_rate) * 100}%</td>
                      <td>{s.active ? "Active" : "Inactive"}</td>
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
