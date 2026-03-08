import { createClient } from "@supabase/supabase-js";

function formatVnd(n: number) {
  return `${new Intl.NumberFormat("vi-VN").format(n)}đ`;
}

type Params = { token: string };

export default async function ReceiptPage({ params }: { params: Promise<Params> }) {
  const { token } = await params;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return <main className="p-8">Thiếu cấu hình Supabase.</main>;
  }

  const supabase = createClient(url, key);

  const { data: receipt, error: receiptErr } = await supabase
    .from("receipts")
    .select("ticket_id,expires_at")
    .eq("public_token", token)
    .gt("expires_at", new Date().toISOString())
    .single();

  if (receiptErr || !receipt) {
    return <main className="p-8">Không tìm thấy receipt hoặc link đã hết hạn.</main>;
  }

  const { data: ticket } = await supabase
    .from("tickets")
    .select("id,created_at,totals_json,customer_id")
    .eq("id", receipt.ticket_id)
    .single();

  if (!ticket) {
    return <main className="p-8">Không tìm thấy ticket.</main>;
  }

  const [{ data: customer }, { data: items }, { data: payment }] = await Promise.all([
    supabase.from("customers").select("name").eq("id", ticket.customer_id).single(),
    supabase
      .from("ticket_items")
      .select("qty,unit_price,vat_rate,services(name)")
      .eq("ticket_id", ticket.id),
    supabase.from("payments").select("method,amount,status").eq("ticket_id", ticket.id).limit(1).single(),
  ]);

  const totals = (ticket.totals_json as { subtotal?: number; vat_total?: number; grand_total?: number } | null) ?? {};

  return (
    <main className="mx-auto max-w-2xl space-y-4 p-6">
      <h1 className="text-2xl font-bold">Receipt</h1>
      <div className="rounded-xl border p-4">
        <p>Khách: {customer?.name ?? "-"}</p>
        <p>Thời gian: {new Date(ticket.created_at).toLocaleString("vi-VN")}</p>
        <p>Thanh toán: {payment?.method ?? "-"}</p>
      </div>

      <div className="rounded-xl border p-4">
        <h2 className="mb-2 font-semibold">Chi tiết dịch vụ</h2>
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
            {(items ?? []).map((it, idx) => {
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
}
