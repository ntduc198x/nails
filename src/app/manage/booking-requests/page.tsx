"use client";

import { AppShell } from "@/components/app-shell";
import { listResources, listStaffMembers } from "@/lib/domain";
import { BookingRequestRow, convertBookingRequestToAppointment, listBookingRequests, updateBookingRequestStatus } from "@/lib/booking-requests";
import { useCallback, useEffect, useMemo, useState } from "react";

type StaffOption = { userId: string; name: string };
type ResourceOption = { id: string; name: string; type: string };

function toInputValue(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

export default function BookingRequestsPage() {
  const [rows, setRows] = useState<BookingRequestRow[]>([]);
  const [staffOptions, setStaffOptions] = useState<StaffOption[]>([]);
  const [resourceOptions, setResourceOptions] = useState<ResourceOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [staffUserId, setStaffUserId] = useState("");
  const [resourceId, setResourceId] = useState("");
  const [bookingAt, setBookingAt] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"ALL" | BookingRequestRow["status"]>("NEW");

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    try {
      if (opts?.silent) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const [requests, staffs, resources] = await Promise.all([
        listBookingRequests(),
        listStaffMembers(),
        listResources(),
      ]);

      setRows(requests);
      setStaffOptions(staffs as StaffOption[]);
      setResourceOptions(resources as ResourceOption[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load booking requests failed");
    } finally {
      if (opts?.silent) setRefreshing(false);
      else setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredRows = useMemo(() => {
    if (statusFilter === "ALL") return rows;
    return rows.filter((row) => row.status === statusFilter);
  }, [rows, statusFilter]);

  const selectedRow = useMemo(() => rows.find((row) => row.id === selectedId) ?? null, [rows, selectedId]);

  useEffect(() => {
    if (!selectedRow) return;
    setBookingAt(toInputValue(new Date(selectedRow.requested_start_at)));
  }, [selectedRow]);

  async function onCancel(id: string) {
    try {
      setSubmitting(true);
      setError(null);
      await updateBookingRequestStatus(id, "CANCELLED");
      if (selectedId === id) setSelectedId(null);
      await load({ silent: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Cancel booking request failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function onConvert() {
    if (!selectedRow) return;

    try {
      setSubmitting(true);
      setError(null);

      const start = new Date(bookingAt);
      const end = addMinutes(start, 60);

      await convertBookingRequestToAppointment({
        bookingRequestId: selectedRow.id,
        staffUserId: staffUserId || null,
        resourceId: resourceId || null,
        startAt: start.toISOString(),
        endAt: end.toISOString(),
      });

      setSelectedId(null);
      setStaffUserId("");
      setResourceId("");
      setBookingAt("");
      await load({ silent: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Convert booking request failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppShell>
      <div className="page-shell">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="page-title">Booking requests</h2>
            <p className="page-subtitle">Lead đặt lịch từ landing page, tách riêng khỏi appointments để xử lý an toàn.</p>
          </div>
          <div className="flex items-center gap-2">
            <select className="input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}>
              <option value="ALL">Tất cả</option>
              <option value="NEW">NEW</option>
              <option value="CONFIRMED">CONFIRMED</option>
              <option value="CANCELLED">CANCELLED</option>
              <option value="CONVERTED">CONVERTED</option>
            </select>
            {refreshing && <span className="text-xs text-neutral-500">Đang làm mới...</span>}
          </div>
        </div>

        {error && <div className="card text-sm text-red-600">Lỗi: {error}</div>}

        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.9fr]">
          <div className="card">
            {loading ? (
              <p className="text-sm text-neutral-500">Đang tải booking requests...</p>
            ) : filteredRows.length === 0 ? (
              <p className="text-sm text-neutral-500">Chưa có yêu cầu nào trong bộ lọc hiện tại.</p>
            ) : (
              <div className="space-y-3">
                {filteredRows.map((row) => {
                  const active = row.id === selectedId;
                  return (
                    <button
                      key={row.id}
                      type="button"
                      onClick={() => setSelectedId(row.id)}
                      className={`w-full rounded-2xl border px-4 py-4 text-left transition ${active ? "border-[var(--color-primary)] bg-[#fff1f3]" : "border-neutral-200 hover:bg-neutral-50"}`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold">{row.customer_name}</p>
                          <p className="mt-1 text-sm text-neutral-500">{row.customer_phone}</p>
                          <p className="mt-2 text-sm text-neutral-600">{new Date(row.requested_start_at).toLocaleString("vi-VN")}</p>
                        </div>
                        <span className="badge-soft">{row.status}</span>
                      </div>

                      <div className="mt-3 grid gap-2 text-sm text-neutral-600 md:grid-cols-2">
                        <p><b>Dịch vụ:</b> {row.requested_service ?? "-"}</p>
                        <p><b>Thợ mong muốn:</b> {row.preferred_staff ?? "-"}</p>
                        <p className="md:col-span-2"><b>Ghi chú:</b> {row.note ?? "-"}</p>
                        {row.appointment_id && <p className="md:col-span-2"><b>Appointment:</b> {row.appointment_id}</p>}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="card space-y-4">
            <div>
              <h3 className="text-lg font-semibold">Xử lý request</h3>
              <p className="mt-1 text-sm text-neutral-500">Chọn một request bên trái để xác nhận hoặc convert thành lịch hẹn nội bộ.</p>
            </div>

            {!selectedRow ? (
              <p className="text-sm text-neutral-500">Chưa chọn request nào.</p>
            ) : (
              <>
                <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4 text-sm">
                  <p><b>Khách:</b> {selectedRow.customer_name}</p>
                  <p><b>SĐT:</b> {selectedRow.customer_phone}</p>
                  <p><b>Giờ yêu cầu:</b> {new Date(selectedRow.requested_start_at).toLocaleString("vi-VN")}</p>
                  <p><b>Dịch vụ:</b> {selectedRow.requested_service ?? "-"}</p>
                </div>

                <div className="space-y-3">
                  <label className="block text-sm">
                    <span className="mb-1 block text-neutral-600">Thời gian chốt</span>
                    <input className="input w-full" type="datetime-local" value={bookingAt} onChange={(e) => setBookingAt(e.target.value)} />
                  </label>

                  <label className="block text-sm">
                    <span className="mb-1 block text-neutral-600">Gán thợ</span>
                    <select className="input w-full" value={staffUserId} onChange={(e) => setStaffUserId(e.target.value)}>
                      <option value="">-- Chọn thợ --</option>
                      {staffOptions.map((s) => <option key={s.userId} value={s.userId}>{s.name}</option>)}
                    </select>
                  </label>

                  <label className="block text-sm">
                    <span className="mb-1 block text-neutral-600">Gán ghế</span>
                    <select className="input w-full" value={resourceId} onChange={(e) => setResourceId(e.target.value)}>
                      <option value="">-- Chọn ghế --</option>
                      {resourceOptions.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                  </label>
                </div>

                <div className="flex flex-wrap gap-2">
                  {selectedRow.status === "NEW" && (
                    <button type="button" className="btn btn-outline" disabled={submitting} onClick={async () => {
                      try {
                        setSubmitting(true);
                        setError(null);
                        await updateBookingRequestStatus(selectedRow.id, "CONFIRMED");
                        await load({ silent: true });
                      } catch (e) {
                        setError(e instanceof Error ? e.message : "Confirm booking request failed");
                      } finally {
                        setSubmitting(false);
                      }
                    }}>
                      Xác nhận lead
                    </button>
                  )}

                  {selectedRow.status !== "CONVERTED" && selectedRow.status !== "CANCELLED" && (
                    <button type="button" className="btn btn-primary" disabled={submitting || !bookingAt} onClick={() => void onConvert()}>
                      {submitting ? "Đang convert..." : "Convert thành appointment"}
                    </button>
                  )}

                  {selectedRow.status !== "CANCELLED" && selectedRow.status !== "CONVERTED" && (
                    <button type="button" className="btn btn-outline text-red-600" disabled={submitting} onClick={() => void onCancel(selectedRow.id)}>
                      Hủy request
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
