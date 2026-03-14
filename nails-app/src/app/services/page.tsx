"use client";

import { AppShell } from "@/components/app-shell";
import { getCurrentSessionRole, type AppRole } from "@/lib/auth";
import { createService, listServices, updateService } from "@/lib/domain";
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDuration, setEditDuration] = useState(45);
  const [editPrice, setEditPrice] = useState(250000);
  const [editVat, setEditVat] = useState(8);
  const [editActive, setEditActive] = useState(true);

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

  function startEdit(row: ServiceRow) {
    setEditingId(row.id);
    setEditName(row.name);
    setEditDuration(row.duration_min);
    setEditPrice(Number(row.base_price));
    setEditVat(Number(row.vat_rate) * 100);
    setEditActive(row.active);
  }

  async function saveEdit() {
    if (!editingId || submitting) return;
    try {
      setSubmitting(true);
      setError(null);
      await updateService({
        id: editingId,
        name: editName,
        durationMin: editDuration,
        basePrice: editPrice,
        vatPercent: editVat,
        active: editActive,
      });
      setEditingId(null);
      await load({ force: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update service failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppShell>
      <div className="page-shell">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="page-title">Dịch vụ & VAT</h2>
            {refreshing && <span className="text-xs text-neutral-500">Đang làm mới...</span>}
          </div>
        </div>
        {role === "ACCOUNTANT" || role === "TECH" ? (
          <p className="text-sm text-amber-700">Role hiện tại chỉ xem danh sách dịch vụ, không thêm/sửa.</p>
        ) : null}

        <form onSubmit={onSubmit} className="grid gap-3 card md:grid-cols-[2fr_1fr_1fr_1fr_auto] md:items-end">
          <div className="stack-tight">
            <label className="text-xs text-neutral-500">Tên dịch vụ</label>
            <input
              className="input w-full"
              placeholder="Tên dịch vụ"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="stack-tight">
            <label className="text-xs text-neutral-500">Duration</label>
            <input
              className="input w-full"
              type="number"
              min={5}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              placeholder="Duration (phút)"
              required
            />
          </div>
          <div className="stack-tight">
            <label className="text-xs text-neutral-500">Giá</label>
            <input
              className="input w-full"
              type="number"
              min={0}
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
              placeholder="Giá"
              required
            />
          </div>
          <div className="stack-tight">
            <label className="text-xs text-neutral-500">VAT %</label>
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
          </div>
          <button
            disabled={submitting || role === "ACCOUNTANT" || role === "TECH"}
            className="btn btn-primary"
          >
            {submitting ? "Đang thêm..." : "Thêm"}
          </button>
        </form>

        <div className="card">
          {error && <p className="mb-3 text-sm text-red-600">Lỗi: {error}</p>}
          {loading ? (
            <p className="text-sm text-neutral-500">Đang tải...</p>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th className="py-2">Tên</th>
                    <th>Duration</th>
                    <th>Giá</th>
                    <th>VAT</th>
                    <th>Trạng thái</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((s) => (
                    <tr key={s.id} className="border-t border-neutral-100">
                      <td className="py-2">{editingId === s.id ? <input className="input w-full" value={editName} onChange={(e) => setEditName(e.target.value)} /> : s.name}</td>
                      <td>{editingId === s.id ? <input className="input w-28" type="number" min={5} value={editDuration} onChange={(e) => setEditDuration(Number(e.target.value))} /> : `${s.duration_min} phút`}</td>
                      <td>{editingId === s.id ? <input className="input w-32" type="number" min={0} value={editPrice} onChange={(e) => setEditPrice(Number(e.target.value))} /> : formatVnd(Number(s.base_price))}</td>
                      <td>{editingId === s.id ? <input className="input w-24" type="number" min={0} step={0.5} value={editVat} onChange={(e) => setEditVat(Number(e.target.value))} /> : `${Number(s.vat_rate) * 100}%`}</td>
                      <td>{editingId === s.id ? <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={editActive} onChange={(e) => setEditActive(e.target.checked)} />{editActive ? "Active" : "Inactive"}</label> : (s.active ? "Active" : "Inactive")}</td>
                      <td className="text-right">
                        {role === "ACCOUNTANT" || role === "TECH" ? null : editingId === s.id ? (
                          <div className="flex justify-end gap-2">
                            <button className="btn btn-outline" type="button" onClick={() => setEditingId(null)}>Huỷ</button>
                            <button className="btn btn-primary" type="button" onClick={() => void saveEdit()} disabled={submitting}>{submitting ? "Đang lưu..." : "Lưu"}</button>
                          </div>
                        ) : (
                          <button className="btn btn-outline" type="button" onClick={() => startEdit(s)}>Sửa</button>
                        )}
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
