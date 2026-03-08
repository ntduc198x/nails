"use client";

import { AppShell } from "@/components/app-shell";
import { getCurrentSessionRole, type AppRole } from "@/lib/auth";
import { createCheckout, listRecentTickets, listServices } from "@/lib/domain";
import { formatVnd } from "@/lib/mock-data";
import { useEffect, useMemo, useState } from "react";

type ServiceRow = {
  id: string;
  name: string;
  base_price: number;
  vat_rate: number;
};

type TicketRow = {
  id: string;
  status: string;
  totals_json?: { grand_total?: number };
  created_at: string;
  customers?: { name: string } | { name: string }[] | null;
  receipts?: { public_token: string; expires_at: string }[];
};

export default function CheckoutPage() {
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [lastReceipt, setLastReceipt] = useState<string | null>(null);
  const [receiptLink, setReceiptLink] = useState<string | null>(null);
  const [dedupeNotice, setDedupeNotice] = useState<string | null>(null);

  const [customerName, setCustomerName] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "TRANSFER">("CASH");
  const [lines, setLines] = useState<Array<{ serviceId: string; qty: number }>>([{ serviceId: "", qty: 1 }]);

  async function load() {
    try {
      setLoading(true);
      setError(null);
      const currentRole = await getCurrentSessionRole();
      setRole(currentRole);

      if (!["OWNER", "MANAGER", "RECEPTION", "ACCOUNTANT"].includes(currentRole)) {
        throw new Error("Role hiện tại không có quyền truy cập trang Checkout");
      }

      const [serviceRows, ticketRows] = await Promise.all([listServices(), listRecentTickets()]);
      setServices(serviceRows as ServiceRow[]);
      setTickets(ticketRows as TicketRow[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load checkout data failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (typeof window !== "undefined") {
      const qs = new URLSearchParams(window.location.search);
      const customer = qs.get("customer");
      if (customer) setCustomerName(customer);
    }
    load();
  }, []);

  const estimatedTotal = useMemo(() => {
    let subtotal = 0;
    let vat = 0;
    for (const line of lines) {
      const s = services.find((x) => x.id === line.serviceId);
      if (!s) continue;
      const unit = Number(s.base_price);
      const rate = Number(s.vat_rate);
      subtotal += unit * line.qty;
      vat += unit * line.qty * rate;
    }
    return subtotal + vat;
  }, [lines, services]);

  function addLine() {
    setLines((prev) => [...prev, { serviceId: "", qty: 1 }]);
  }

  function updateLine(index: number, patch: Partial<{ serviceId: string; qty: number }>) {
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;

    try {
      setSubmitting(true);
      setError(null);
      setDedupeNotice(null);

      if (role === "ACCOUNTANT" || role === "TECH") {
        throw new Error("Role hiện tại không được phép tạo thanh toán.");
      }
      const valid = lines.filter((l) => l.serviceId && l.qty > 0);
      if (!valid.length) throw new Error("Vui lòng chọn ít nhất 1 dịch vụ trước khi Pay & Close");

      const result = await createCheckout({
        customerName,
        paymentMethod,
        lines: valid,
      });

      setLastReceipt(result.receiptToken || null);
      if (result.receiptToken && typeof window !== "undefined") {
        setReceiptLink(`${window.location.origin}/receipt/${result.receiptToken}`);
      } else {
        setReceiptLink(null);
      }

      if (result.deduped) {
        setDedupeNotice("Đã chặn tạo bill trùng do thao tác bấm thanh toán lặp nhanh.");
      }

      setCustomerName("");
      setPaymentMethod("CASH");
      setLines([{ serviceId: "", qty: 1 }]);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Checkout failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppShell>
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Checkout (Ticket + Payment + Receipt)</h2>
        {role === "ACCOUNTANT" && (
          <p className="text-sm text-amber-700">Role ACCOUNTANT chỉ xem dữ liệu checkout, không tạo Pay & Close.</p>
        )}

        <form onSubmit={onSubmit} className="space-y-3 rounded-2xl bg-white p-4 shadow-sm">
          <div className="grid gap-3 md:grid-cols-3">
            <input
              className="rounded-lg border px-3 py-2"
              placeholder="Tên khách"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              required
            />
            <select
              className="rounded-lg border px-3 py-2"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as "CASH" | "TRANSFER")}
            >
              <option value="CASH">Tiền mặt</option>
              <option value="TRANSFER">Chuyển khoản</option>
            </select>
            <div className="rounded-lg bg-neutral-100 px-3 py-2 text-sm">Tổng tạm tính: {formatVnd(estimatedTotal)}</div>
          </div>

          {lines.map((line, idx) => (
            <div key={idx} className="grid gap-3 md:grid-cols-4">
              <select
                className="rounded-lg border px-3 py-2 md:col-span-3"
                value={line.serviceId}
                onChange={(e) => updateLine(idx, { serviceId: e.target.value })}
              >
                <option value="">-- Chọn dịch vụ --</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} · {formatVnd(Number(s.base_price))}
                  </option>
                ))}
              </select>
              <input
                className="rounded-lg border px-3 py-2"
                type="number"
                min={1}
                value={line.qty}
                onChange={(e) => updateLine(idx, { qty: Number(e.target.value) })}
              />
            </div>
          ))}

          <div className="flex gap-2">
            <button type="button" onClick={addLine} className="rounded-lg border px-4 py-2 text-sm">
              + Thêm dòng
            </button>
            <button
              disabled={submitting || role === "ACCOUNTANT" || role === "TECH"}
              className="rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "Đang xử lý..." : "Pay & Close"}
            </button>
          </div>
        </form>

        {lastReceipt && (
          <div className="space-y-2 rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-800">
            <div>
              Tạo receipt thành công. Token: <code>{lastReceipt}</code>
            </div>
            {receiptLink && (
              <div className="flex flex-wrap items-center gap-2">
                <a className="underline" href={receiptLink} target="_blank" rel="noreferrer">
                  Mở link receipt
                </a>
                <button
                  type="button"
                  className="rounded border border-green-400 px-2 py-1 text-xs"
                  onClick={async () => {
                    await navigator.clipboard.writeText(receiptLink);
                  }}
                >
                  Copy link
                </button>
              </div>
            )}
          </div>
        )}

        {dedupeNotice && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">{dedupeNotice}</div>
        )}

        <div className="rounded-2xl bg-white p-5 shadow-sm">
          {error && <p className="mb-3 text-sm text-red-600">Lỗi: {error}</p>}
          {loading ? (
            <p className="text-sm text-neutral-500">Đang tải...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-neutral-500">
                  <tr>
                    <th className="py-2">Thời gian</th>
                    <th>Khách</th>
                    <th>Trạng thái</th>
                    <th>Tổng</th>
                    <th>Receipt token</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map((t) => {
                    const customer = Array.isArray(t.customers) ? t.customers[0]?.name : t.customers?.name;
                    const token = t.receipts?.[0]?.public_token ?? "-";
                    return (
                      <tr key={t.id} className="border-t border-neutral-100">
                        <td className="py-2">{new Date(t.created_at).toLocaleString("vi-VN")}</td>
                        <td>{customer ?? "-"}</td>
                        <td>{t.status}</td>
                        <td>{formatVnd(Number(t.totals_json?.grand_total ?? 0))}</td>
                        <td className="max-w-[240px] truncate">{token}</td>
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
