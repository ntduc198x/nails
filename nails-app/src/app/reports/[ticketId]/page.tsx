import { getTicketDetail } from "@/lib/reporting";

function formatVnd(n: number) {
  return `${new Intl.NumberFormat("vi-VN").format(n)}đ`;
}

type Params = { ticketId: string };

export default async function TicketDetailPage({ params }: { params: Promise<Params> }) {
  const { ticketId } = await params;

  try {
    const detail = await getTicketDetail(ticketId);
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
          <p>Payment: {detail.payment?.method ?? "-"} ({detail.payment?.status ?? "-"})</p>
          {detail.receipt?.public_token && (
            <p>
              Receipt: <a className="underline" href={`/receipt/${detail.receipt.public_token}`}>/receipt/{detail.receipt.public_token}</a>
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
              {detail.items.map((it, idx) => {
                const svc = Array.isArray(it.services) ? it.services[0] : it.services;
                return (
                  <tr key={idx} className="border-t">
                    <td className="py-2">{svc?.name ?? "-"}</td>
                    <td>{it.qty}</td>
                    <td>{formatVnd(Number(it.unit_price))}</td>
                    <td>{Number(it.vat_rate) * 100}%</td>
                  </tr>
                );
              })}
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
  } catch (e) {
    return <main className="p-6">Không tải được ticket detail: {e instanceof Error ? e.message : "Unknown error"}</main>;
  }
}
