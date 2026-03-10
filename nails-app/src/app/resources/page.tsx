"use client";

import { AppShell } from "@/components/app-shell";
import { createResource, listResources } from "@/lib/domain";
import { useEffect, useState } from "react";

type ResourceRow = { id: string; name: string; type: "CHAIR" | "TABLE" | "ROOM"; active: boolean };

export default function ResourcesPage() {
  const [rows, setRows] = useState<ResourceRow[]>([]);
  const [name, setName] = useState("");
  const [type, setType] = useState<"CHAIR" | "TABLE" | "ROOM">("CHAIR");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
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

  return (
    <AppShell>
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Quản lý ghế / bàn (Resources)</h2>

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
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id}>
                      <td>{r.name}</td>
                      <td>{r.type}</td>
                      <td>{r.active ? "Active" : "Inactive"}</td>
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
