"use client";

import { AppShell } from "@/components/app-shell";
import { createResource, listResources, updateResource } from "@/lib/domain";
import { useEffect, useState } from "react";

type ResourceRow = { id: string; name: string; type: "CHAIR" | "TABLE" | "ROOM"; active: boolean };

export default function ResourcesPage() {
  const [rows, setRows] = useState<ResourceRow[]>([]);
  const [name, setName] = useState("");
  const [type, setType] = useState<"CHAIR" | "TABLE" | "ROOM">("CHAIR");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editType, setEditType] = useState<"CHAIR" | "TABLE" | "ROOM">("CHAIR");
  const [editActive, setEditActive] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      setError(null);
      const data = await listResources({ force: true, activeOnly: false });
      setRows(data as ResourceRow[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load resources failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;

    try {
      setSubmitting(true);
      setError(null);
      await createResource({ name, type });
      setName("");
      setType("CHAIR");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Create resource failed");
    } finally {
      setSubmitting(false);
    }
  }

  function startEdit(row: ResourceRow) {
    setEditingId(row.id);
    setEditName(row.name);
    setEditType(row.type);
    setEditActive(row.active);
  }

  async function saveEdit() {
    if (!editingId || submitting) return;

    try {
      setSubmitting(true);
      setError(null);
      await updateResource({ id: editingId, name: editName, type: editType, active: editActive });
      setEditingId(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update resource failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppShell>
      <div className="page-shell">
        <div>
          <h2 className="page-title">Quản lý ghế / bàn (Resources)</h2>
          <p className="page-subtitle">Bật/tắt nhanh resource và đổi tên/loại ngay trên danh sách.</p>
        </div>

        <form onSubmit={onSubmit} className="card grid gap-3 md:grid-cols-4">
          <input className="input md:col-span-2" placeholder="Tên resource (VD: Ghế 01)" value={name} onChange={(e) => setName(e.target.value)} required />
          <select className="input" value={type} onChange={(e) => setType(e.target.value as "CHAIR" | "TABLE" | "ROOM")}>
            <option value="CHAIR">CHAIR</option>
            <option value="TABLE">TABLE</option>
            <option value="ROOM">ROOM</option>
          </select>
          <button className="btn btn-primary" disabled={submitting}>{submitting ? "Đang thêm..." : "Thêm resource"}</button>
        </form>

        <div className="card">
          {error && <p className="mb-2 text-sm text-red-600">Lỗi: {error}</p>}
          {loading ? (
            <p className="text-sm text-neutral-500">Đang tải...</p>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Tên</th>
                    <th>Loại</th>
                    <th>Trạng thái</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id}>
                      <td>
                        {editingId === r.id ? (
                          <input className="input w-full" value={editName} onChange={(e) => setEditName(e.target.value)} />
                        ) : (
                          r.name
                        )}
                      </td>
                      <td>
                        {editingId === r.id ? (
                          <select className="input" value={editType} onChange={(e) => setEditType(e.target.value as "CHAIR" | "TABLE" | "ROOM") }>
                            <option value="CHAIR">CHAIR</option>
                            <option value="TABLE">TABLE</option>
                            <option value="ROOM">ROOM</option>
                          </select>
                        ) : (
                          r.type
                        )}
                      </td>
                      <td>
                        {editingId === r.id ? (
                          <label className="inline-flex items-center gap-2 text-sm">
                            <input type="checkbox" checked={editActive} onChange={(e) => setEditActive(e.target.checked)} />
                            {editActive ? "Active" : "Inactive"}
                          </label>
                        ) : (
                          <span className={r.active ? "text-emerald-600" : "text-neutral-500"}>{r.active ? "Active" : "Inactive"}</span>
                        )}
                      </td>
                      <td className="text-right">
                        {editingId === r.id ? (
                          <div className="flex justify-end gap-2">
                            <button className="btn btn-outline" onClick={() => setEditingId(null)} type="button">Huỷ</button>
                            <button className="btn btn-primary" onClick={() => void saveEdit()} type="button" disabled={submitting}>
                              {submitting ? "Đang lưu..." : "Lưu"}
                            </button>
                          </div>
                        ) : (
                          <button className="btn btn-outline" onClick={() => startEdit(r)} type="button">Sửa</button>
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
