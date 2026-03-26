"use client";

import { getTicketDetail } from "@/lib/reporting";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

function formatVnd(n: number) {
  return `${new Intl.NumberFormat("vi-VN").format(n)}đ`;
}

type Detail = Awaited<ReturnType<typeof getTicketDetail>>;

export default function TicketDetailPage() {
  const params = useParams<{ ticketId: string }>();
  const ticketId = params?.ticketId;

  const [detail, setDetail] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function run() {
      if (!ticketId) return;
      try {
        setLoading(true);
        setError(null);
        const data = await getTicketDetail(ticketId);
        setDetail(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }
    run();
  }, [ticketId]);

  if (loading) return <main className="p-6">Đang tải ticket detail...</main>;
  if (error || !detail)
    return <main className="p-6">Không tải được ticket detail: {error ?? "Không có dữ liệu"}</main>;

  const totals = (detail.ticket.totals_json as { subtotal?: number; vat_total?: number; grand_total?: number } | null) ?? {};

  return (
    <main className="mx-auto max-w-3xl space-y-4 p-6">
      <h1 className="text-2xl font-bold">Ticket detail</h1>
      <div className="rounded-xl border p-4 text-sm">
        <p>Mã ticket: {detail.ticket.id}</p>
        <p>Thời gian: {new Date(detail.ticket.created_at).toLocaleString("vi-VN")}</p>
        <p>Khách: {detail.customer?.name ?? "-"}</p>
        <p>SĐT: {detail.customer?.phone ?? "-"}</p>
        <p>Trạng thái: {detail.ticket.status}</p>
        <p>
          Payment: {detail.payment?.method ?? "-"} ({detail.payment?.status ?? "-"})
        </p>
        {detail.receipt?.public_token && (
          <p>
            Receipt: <Link className="underline" href={`/receipt/${detail.receipt.public_token}`}>/receipt/{detail.receipt.public_token}</Link>
          </p>
        )}
      </div>

      <div className="rounded-xl border p-4">
        <h2 className="mb-2 font-semibold">Items</h2>
        <table className="w-full text-left text-sm">
          <thead className="text-neutral-500">
            <tr>
              <th className="py-2">Dịch vụ</th>
              <th>SL</th>
              <th>Đơn giá</th>
              <th>VAT</th>
            </tr>
          </thead>
          <tbody>
            {detail.items.length === 0 ? (
              <tr className="border-t">
                <td className="py-3 text-neutral-500" colSpan={4}>
                  Không có ticket items cho bill này (có thể là bill cũ bị lỗi trước khi fix RLS).
                </td>
              </tr>
            ) : (
              detail.items.map((it, idx) => {
                return (
                  <tr key={idx} className="border-t">
                    <td className="py-2">{it.service_name ?? "-"}</td>
                    <td>{it.qty}</td>
                    <td>{formatVnd(Number(it.unit_price))}</td>
                    <td>{Number(it.vat_rate) * 100}%</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="rounded-xl border p-4 text-sm">
        <p>Subtotal: {formatVnd(Number(totals.subtotal ?? 0))}</p>
        <p>VAT: {formatVnd(Number(totals.vat_total ?? 0))}</p>
        <p className="mt-2 text-lg font-semibold">Tổng: {formatVnd(Number(totals.grand_total ?? 0))}</p>
      </div>
    </main>
  );
}
