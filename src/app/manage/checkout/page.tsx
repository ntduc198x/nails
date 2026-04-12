"use client";

import { AppShell } from "@/components/app-shell";
import { ManageQuickNav } from "@/components/manage-quick-nav";
import { getCurrentSessionRole, type AppRole } from "@/lib/auth";
import { createCheckout, hasOpenShift, listCheckedInAppointments, listRecentTickets, listServices } from "@/lib/domain";
import { formatVnd } from "@/lib/mock-data";
import { useCallback, useEffect, useMemo, useState } from "react";

type ServiceRow = { id: string; name: string; base_price: number; vat_rate: number };
type TicketRow = { id: string; status: string; totals_json?: { grand_total?: number }; created_at: string; customers?: { name: string } | { name: string }[] | null; receipts?: { public_token: string; expires_at: string }[] };
type CheckedInAppointment = { id: string; start_at: string; customers?: { name: string } | { name: string }[] | null };
type RangeMode = "day" | "week" | "month" | "custom";

function mapCheckoutError(message: string) {
  if (message.includes("INVALID_SERVICES")) return "Dịch vụ không hợp lệ hoặc đã bị xóa.";
  if (message.includes("FORBIDDEN")) return "Bạn không có quyền tạo checkout.";
  if (message.includes("INVALID_PAYMENT_METHOD")) return "Phương thức thanh toán không hợp lệ.";
  if (message.includes("CHECKOUT_LINES_REQUIRED")) return "Vui lòng chọn ít nhất 1 dịch vụ.";
  if (message.includes("CUSTOMER_NAME_REQUIRED")) return "Vui lòng nhập tên khách.";
  if (message.includes("INVALID_APPOINTMENT_STATUS_TRANSITION")) return "Appointment không thể chuyển sang trạng thái DONE.";
  if (message.includes("Could not choose the best candidate function")) return "RPC checkout đang bị trùng phiên bản. Chạy cleanup_checkout_rpc_overloads.sql rồi thử lại.";
  return message;
}

function startOfDay(date: Date) { const d = new Date(date); d.setHours(0,0,0,0); return d; }
function endOfDay(date: Date) { const d = new Date(date); d.setHours(23,59,59,999); return d; }
function startOfWeek(date: Date) { const d = startOfDay(date); const day = (d.getDay() + 6) % 7; d.setDate(d.getDate() - day); return d; }
function endOfWeek(date: Date) { const d = startOfWeek(date); d.setDate(d.getDate() + 6); d.setHours(23,59,59,999); return d; }
function startOfMonth(date: Date) { return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0); }
function endOfMonth(date: Date) { return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999); }
function toDateInputValue(date: Date) { const y = date.getFullYear(); const m = `${date.getMonth() + 1}`.padStart(2, "0"); const d = `${date.getDate()}`.padStart(2, "0"); return `${y}-${m}-${d}`; }

export default function CheckoutPage() {
  const today = new Date();
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [checkedInAppointments, setCheckedInAppointments] = useState<CheckedInAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [techShiftOpen, setTechShiftOpen] = useState<boolean | null>(null);
  const [lastReceipt, setLastReceipt] = useState<string | null>(null);
  const [receiptLink, setReceiptLink] = useState<string | null>(null);
  const [dedupeNotice, setDedupeNotice] = useState<string | null>(null);
  const [rangeMode, setRangeMode] = useState<RangeMode>("day");
  const [fromDate, setFromDate] = useState(toDateInputValue(today));
  const [toDate, setToDate] = useState(toDateInputValue(today));

  const [customerName, setCustomerName] = useState("");
  const [appointmentId, setAppointmentId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "TRANSFER">("CASH");
  const [lines, setLines] = useState<Array<{ serviceId: string; qty: number }>>([{ serviceId: "", qty: 1 }]);

  const range = useMemo(() => {
    const now = new Date();
    if (rangeMode === "day") return { from: startOfDay(now), to: endOfDay(now) };
    if (rangeMode === "week") return { from: startOfWeek(now), to: endOfWeek(now) };
    if (rangeMode === "month") return { from: startOfMonth(now), to: endOfMonth(now) };
    return { from: startOfDay(new Date(fromDate)), to: endOfDay(new Date(toDate)) };
  }, [fromDate, rangeMode, toDate]);

  const load = useCallback(async () => {
    const isInitial = services.length === 0 && tickets.length === 0;
    try {
      if (isInitial) setLoading(true); else setRefreshing(true);
      setError(null);
      const currentRole = await getCurrentSessionRole();
      setRole(currentRole);
      if (!["OWNER", "MANAGER", "RECEPTION", "ACCOUNTANT", "TECH"].includes(currentRole)) throw new Error("Vai trò hiện tại không có quyền truy cập trang thanh toán");
      const [serviceRows, ticketRows, checkedInRows, openShift] = await Promise.all([
        listServices(),
        listRecentTickets({ fromIso: range.from.toISOString(), toIso: range.to.toISOString(), limit: 200, force: true }),
        listCheckedInAppointments(),
        currentRole === "TECH" ? hasOpenShift() : Promise.resolve(true),
      ]);
      setServices(serviceRows as ServiceRow[]);
      setTickets(ticketRows as TicketRow[]);
      setCheckedInAppointments(checkedInRows as CheckedInAppointment[]);
      setTechShiftOpen(openShift);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Tải dữ liệu thanh toán thất bại");
    } finally {
      if (isInitial) setLoading(false); else setRefreshing(false);
    }
  }, [range.from, range.to, services.length, tickets.length]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const qs = new URLSearchParams(window.location.search);
      const customer = qs.get("customer");
      const appointment = qs.get("appointmentId");
      if (customer) setCustomerName(customer);
      if (appointment) setAppointmentId(appointment);
    }
    void load();
  }, [load]);

  const estimatedTotal = useMemo(() => {
    let subtotal = 0; let vat = 0;
    for (const line of lines) {
      const s = services.find((x) => x.id === line.serviceId); if (!s) continue;
      const unit = Number(s.base_price); const rate = Number(s.vat_rate);
      subtotal += unit * line.qty; vat += unit * line.qty * rate;
    }
    return subtotal + vat;
  }, [lines, services]);

  const ticketSummary = useMemo(() => ({ count: tickets.length, total: tickets.reduce((sum, t) => sum + Number(t.totals_json?.grand_total ?? 0), 0) }), [tickets]);
  const selectedServices = useMemo(() => lines.map((line) => ({ ...line, service: services.find((service) => service.id === line.serviceId) ?? null })).filter((line) => line.service), [lines, services]);

  function addLine() { setLines((prev) => [...prev, { serviceId: "", qty: 1 }]); }
  function onSelectCheckedInAppointment(id: string) { setAppointmentId(id || null); const picked = checkedInAppointments.find((a) => a.id === id); const customer = Array.isArray(picked?.customers) ? picked?.customers[0]?.name : picked?.customers?.name; if (customer) setCustomerName(customer); }
  function updateLine(index: number, patch: Partial<{ serviceId: string; qty: number }>) { setLines((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l))); }
  function removeLine(index: number) { setLines((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== index))); }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    try {
      setSubmitting(true); setError(null); setDedupeNotice(null);
      if (role === "ACCOUNTANT") throw new Error("Vai trò hiện tại không được phép tạo thanh toán.");
      if (role === "TECH") {
        const openShift = await hasOpenShift();
        setTechShiftOpen(openShift);
        if (!openShift) throw new Error("TECH chỉ được checkout khi đang mở ca.");
      }
      const valid = lines.filter((l) => l.serviceId && l.qty > 0);
      if (!valid.length) throw new Error("Vui lòng chọn ít nhất 1 dịch vụ trước khi thanh toán");
      const idempotencyKey = (typeof crypto !== "undefined" && "randomUUID" in crypto) ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const result = await createCheckout({ customerName, paymentMethod, lines: valid, appointmentId: appointmentId ?? undefined, idempotencyKey });
      setLastReceipt(result.receiptToken || null);
      setReceiptLink(result.receiptToken && typeof window !== "undefined" ? `${window.location.origin}/receipt/${result.receiptToken}` : null);
      if (result.deduped) setDedupeNotice("Đã chặn tạo bill trùng do thao tác bấm thanh toán lặp nhanh.");
      setCustomerName(""); setAppointmentId(null); setPaymentMethod("CASH"); setLines([{ serviceId: "", qty: 1 }]);
      await load();
    } catch (e) {
      if (e instanceof Error) setError(mapCheckoutError(e.message));
      else if (e && typeof e === "object" && "message" in e) setError(mapCheckoutError(String((e as { message?: unknown }).message ?? "Thanh toán thất bại")));
      else setError("Thanh toán thất bại");
    } finally { setSubmitting(false); }
  }

  return (
    <AppShell>
      <div className="space-y-5 pb-24 md:pb-0">
        <div className="manage-surface">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h2 className="page-title">Thanh toán</h2>
                {refreshing && <span className="text-xs text-neutral-500">Đang làm mới...</span>}
              </div>
              <p className="text-sm text-neutral-500">Màn hình thu ngân, ưu tiên thao tác nhanh để chọn khách, lên bill và chốt thanh toán.</p>
            </div>
            <div className="grid gap-2 text-sm md:grid-cols-2">
              <div className="rounded-2xl bg-neutral-100 px-4 py-3 text-neutral-700">Số bill trong kỳ<br /><span className="text-lg font-semibold text-neutral-900">{ticketSummary.count}</span></div>
              <div className="rounded-2xl bg-neutral-100 px-4 py-3 text-neutral-700">Doanh thu trong kỳ<br /><span className="text-lg font-semibold text-neutral-900">{formatVnd(ticketSummary.total)}</span></div>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-sm">
             {role === "ACCOUNTANT" && <div className="rounded-full bg-amber-50 px-3 py-1 text-amber-700">Kế toán chỉ xem dữ liệu thanh toán</div>}
             {role === "TECH" && <div className={`rounded-full px-3 py-1 ${techShiftOpen ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{techShiftOpen ? "Kỹ thuật viên đang mở ca, được phép thanh toán" : "Kỹ thuật viên đang đóng ca, không được thanh toán"}</div>}
            {role === "ACCOUNTANT" && <div className="rounded-full bg-amber-50 px-3 py-1 text-amber-700">Kế toán chỉ xem dữ liệu thanh toán</div>}
            {role === "TECH" && <div className={`rounded-full px-3 py-1 ${techShiftOpen ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{techShiftOpen ? "Kỹ thuật viên đang mở ca, được phép thanh toán" : "Kỹ thuật viên đang đóng ca, không được thanh toán"}</div>}
            {appointmentId && <div className="rounded-full bg-neutral-100 px-3 py-1 text-neutral-700">Đang gắn appointment: <code>{appointmentId}</code></div>}
          </div>
          <ManageQuickNav
            className="mt-4"
            items={[
              { href: "/manage/technician", label: "Bảng kỹ thuật" },
              { href: "/manage/appointments", label: "Lịch hẹn" },
              { href: "/manage/shifts", label: "Ca làm" },
            ]}
          />
        </div>

        {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">Lỗi: {error}</div>}
        {lastReceipt && <div className="space-y-2 rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-800"><div>Tạo hóa đơn thành công. Mã công khai: <code>{lastReceipt}</code></div>{receiptLink && <div className="flex flex-wrap items-center gap-2"><a className="underline" href={receiptLink} target="_blank" rel="noreferrer">Mở link hóa đơn</a><button type="button" className="rounded border border-green-400 px-2 py-1 text-xs" onClick={async () => { await navigator.clipboard.writeText(receiptLink); }}>Sao chép link</button></div>}</div>}
        {dedupeNotice && <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">{dedupeNotice}</div>}

        <form onSubmit={onSubmit} className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_380px]">
          <div className="space-y-5">
            <div className="card space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-neutral-900">1. Chọn khách</h3>
                  <p className="text-sm text-neutral-500">Có thể lấy nhanh từ appointment đang checked-in hoặc nhập tay.</p>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <div className="space-y-2 md:col-span-3">
                  <label className="text-sm font-medium text-neutral-700">Khách đang CHECKED_IN</label>
                  <select className="input" value={appointmentId ?? ""} onChange={(e) => onSelectCheckedInAppointment(e.target.value)}>
                    <option value="">-- Chọn từ appointment --</option>
                    {checkedInAppointments.map((a) => { const customer = Array.isArray(a.customers) ? a.customers[0]?.name : a.customers?.name; return <option key={a.id} value={a.id}>{(customer ?? "Khách") + " · " + new Date(a.start_at).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}</option>; })}
                  </select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium text-neutral-700">Tên khách</label>
                  <input className="input" placeholder="Nhập tên khách" value={customerName} onChange={(e) => setCustomerName(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-neutral-700">Thanh toán</label>
                  <select className="input" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as "CASH" | "TRANSFER")}><option value="CASH">Tiền mặt</option><option value="TRANSFER">Chuyển khoản</option></select>
                </div>
              </div>
            </div>

            <div className="card space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-neutral-900">2. Lên bill dịch vụ</h3>
                  <p className="text-sm text-neutral-500">Giữ thao tác ngắn, thêm dòng nhanh và bỏ dòng thừa khi cần.</p>
                </div>
                <button type="button" onClick={addLine} className="rounded-lg border px-3 py-2 text-sm">+ Thêm dòng</button>
              </div>

              <div className="space-y-3">
                {lines.map((line, idx) => (
                  <div key={idx} className="rounded-2xl border border-neutral-200 bg-neutral-50 p-3">
                    <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_120px_88px] md:items-end">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-neutral-700">Dịch vụ #{idx + 1}</label>
                        <select className="input bg-white" value={line.serviceId} onChange={(e) => updateLine(idx, { serviceId: e.target.value })}>
                          <option value="">-- Chọn dịch vụ --</option>
                          {services.map((s) => <option key={s.id} value={s.id}>{s.name} · {formatVnd(Number(s.base_price))}</option>)}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-neutral-700">Số lượng</label>
                        <input className="input bg-white" type="number" min={1} value={line.qty} onChange={(e) => updateLine(idx, { qty: Number(e.target.value) })} />
                      </div>
                      <button type="button" onClick={() => removeLine(idx)} disabled={lines.length === 1} className="rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-600 disabled:cursor-not-allowed disabled:opacity-50">Xóa</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card space-y-3">
              <div>
                <h3 className="font-semibold">Lịch sử phiếu thanh toán</h3>
                <p className="text-sm text-neutral-500">Phần phụ để tra cứu nhanh, không chen vào luồng thanh toán chính.</p>
              </div>

              <div className="grid gap-3 md:grid-cols-4">
                <select className="input" value={rangeMode} onChange={(e) => setRangeMode(e.target.value as RangeMode)}>
                  <option value="day">Trong ngày</option>
                  <option value="week">Trong tuần</option>
                  <option value="month">Trong tháng</option>
                  <option value="custom">Tùy chỉnh</option>
                </select>
                <input className="input" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} disabled={rangeMode !== "custom"} />
                <input className="input" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} disabled={rangeMode !== "custom"} />
                <div className="rounded-xl bg-neutral-100 px-3 py-2 text-sm text-neutral-700">{range.from.toLocaleDateString("vi-VN")} → {range.to.toLocaleDateString("vi-VN")}</div>
              </div>

              {loading ? <p className="text-sm text-neutral-500">Đang tải...</p> : (
                <div className="space-y-3">
                  {tickets.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-neutral-200 px-4 py-6 text-sm text-neutral-500">Chưa có bill nào trong khoảng thời gian này.</div>
                  ) : tickets.map((t) => {
                    const customer = Array.isArray(t.customers) ? t.customers[0]?.name : t.customers?.name;
                    const token = t.receipts?.[0]?.public_token ?? "-";
                    return (
                      <div key={t.id} className="rounded-2xl border border-neutral-200 p-4">
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div className="space-y-1">
                            <div className="text-sm font-semibold text-neutral-900">{customer ?? "Khách lẻ"}</div>
                            <div className="text-sm text-neutral-500">{new Date(t.created_at).toLocaleString("vi-VN")}</div>
                          </div>
                          <div className="text-left md:text-right">
                            <div className="text-sm text-neutral-500">Tổng bill</div>
                            <div className="text-base font-semibold text-neutral-900">{formatVnd(Number(t.totals_json?.grand_total ?? 0))}</div>
                          </div>
                        </div>
                        <div className="mt-3 grid gap-2 text-sm text-neutral-600">
                          <div>Trạng thái: <span className="font-medium text-neutral-900">{t.status}</span></div>
                          <div className="truncate">Mã hóa đơn: <span className="font-mono text-xs text-neutral-800">{token}</span></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-5">
            <div className="card sticky top-4 space-y-4 xl:self-start">
              <div>
                <h3 className="font-semibold text-neutral-900">3. Tóm tắt bill</h3>
                <p className="text-sm text-neutral-500">Khu vực chốt tiền, mọi thông tin quan trọng gom vào một chỗ.</p>
              </div>

              <div className="rounded-2xl bg-neutral-50 p-4">
                <div className="text-sm text-neutral-500">Khách hàng</div>
                <div className="mt-1 text-lg font-semibold text-neutral-900">{customerName || "Chưa chọn khách"}</div>
                <div className="mt-3 text-sm text-neutral-500">Phương thức</div>
                <div className="mt-1 font-medium text-neutral-900">{paymentMethod === "CASH" ? "Tiền mặt" : "Chuyển khoản"}</div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm text-neutral-500">
                  <span>Số dòng dịch vụ</span>
                  <span>{selectedServices.length}</span>
                </div>
                <div className="space-y-2 rounded-2xl border border-neutral-200 p-3">
                  {selectedServices.length === 0 ? (
                    <div className="text-sm text-neutral-500">Chưa có dịch vụ nào được chọn.</div>
                  ) : selectedServices.map((line, idx) => {
                    const service = line.service;
                    if (!service) return null;
                    return (
                      <div key={`${line.serviceId}-${idx}`} className="flex items-start justify-between gap-3 text-sm">
                        <div>
                          <div className="font-medium text-neutral-900">{service.name}</div>
                          <div className="text-neutral-500">SL: {line.qty}</div>
                        </div>
                        <div className="font-medium text-neutral-900">{formatVnd(Number(service.base_price) * line.qty * (1 + Number(service.vat_rate)))}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-2xl bg-neutral-900 p-4 text-white">
                <div className="text-sm text-neutral-300">Tổng thanh toán</div>
                <div className="mt-2 text-3xl font-semibold">{formatVnd(estimatedTotal)}</div>
              </div>

              <div className="hidden md:flex flex-col gap-2">
                <button disabled={submitting || role === "ACCOUNTANT" || (role === "TECH" && techShiftOpen === false)} className="btn btn-primary w-full py-3 text-base">{submitting ? "Đang xử lý..." : "Thanh toán và đóng bill"}</button>
                {role === "TECH" && techShiftOpen === false && <p className="text-xs text-amber-700">Cần mở ca trước khi thanh toán.</p>}
              </div>
            </div>
          </div>

          <div className="fixed bottom-0 left-0 right-0 z-10 border-t bg-white p-3 md:hidden"><div className="mx-auto flex max-w-6xl gap-2"><button type="button" onClick={addLine} className="flex-1 rounded-lg border px-4 py-3 text-sm font-medium">+ Thêm dòng</button><button disabled={submitting || role === "ACCOUNTANT" || (role === "TECH" && techShiftOpen === false)} className="flex-1 btn btn-primary py-3">{submitting ? "Đang xử lý..." : "Thanh toán"}</button></div>{role === "TECH" && techShiftOpen === false && <p className="mt-2 text-xs text-amber-700">Cần mở ca trước khi thanh toán.</p>}</div>
        </form>
      </div>
    </AppShell>
  );
}
