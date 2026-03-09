import { listTicketsInRange, listTimeEntriesInRange } from "@/lib/reporting";

export type TaxBookType = "S1A_HKD" | "S2A_HKD" | "S3A_HKD";

export type TaxBookRow = {
  date: string;
  description: string;
  amount: number;
};

export async function buildTaxBook(type: TaxBookType, fromIso: string, toIso: string): Promise<TaxBookRow[]> {
  if (type === "S1A_HKD") {
    const tickets = await listTicketsInRange(fromIso, toIso);
    return tickets
      .filter((t) => t.status === "CLOSED")
      .map((t) => ({
        date: t.created_at,
        description: `Doanh thu dịch vụ - Ticket ${t.id.slice(0, 8)}`,
        amount: Number(t.totals_json?.grand_total ?? 0),
      }));
  }

  if (type === "S2A_HKD") {
    const tickets = await listTicketsInRange(fromIso, toIso);
    return tickets
      .filter((t) => t.status === "CLOSED")
      .map((t) => ({
        date: t.created_at,
        description: `VAT đầu ra - Ticket ${t.id.slice(0, 8)}`,
        amount: Number(t.totals_json?.vat_total ?? 0),
      }));
  }

  const entries = await listTimeEntriesInRange(fromIso, toIso);
  return (entries as Array<{ staff_user_id: string; clock_in: string; clock_out: string | null }>).map((e) => {
    const start = new Date(e.clock_in).getTime();
    const end = e.clock_out ? new Date(e.clock_out).getTime() : Date.now();
    const mins = Math.max(0, Math.round((end - start) / 60000));
    return {
      date: e.clock_in,
      description: `Công thợ ${e.staff_user_id.slice(0, 8)} (${mins} phút)`,
      amount: 0,
    };
  });
}
