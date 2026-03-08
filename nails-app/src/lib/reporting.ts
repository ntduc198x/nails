import { ensureOrgContext } from "@/lib/domain";
import { supabase } from "@/lib/supabase";

export type ReportTicketRow = {
  id: string;
  status: string;
  created_at: string;
  totals_json?: { subtotal?: number; vat_total?: number; grand_total?: number };
};

export async function listTicketsInRange(fromIso: string, toIso: string) {
  if (!supabase) return [];
  const { orgId } = await ensureOrgContext();

  const { data, error } = await supabase
    .from("tickets")
    .select("id,status,created_at,totals_json")
    .eq("org_id", orgId)
    .gte("created_at", fromIso)
    .lt("created_at", toIso)
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) throw error;
  return (data ?? []) as ReportTicketRow[];
}

export async function getReportBreakdown(fromIso: string, toIso: string) {
  if (!supabase) throw new Error("Supabase chưa cấu hình");
  await ensureOrgContext();

  const { data, error } = await supabase.rpc("get_report_breakdown_secure", {
    p_from: fromIso,
    p_to: toIso,
  });

  if (error) throw error;
  return (data ?? {
    summary: { count: 0, subtotal: 0, vat: 0, revenue: 0 },
    by_service: [],
    by_payment: [],
  }) as {
    summary: { count: number; subtotal: number; vat: number; revenue: number };
    by_service: Array<{ service_name: string; qty: number; subtotal: number }>;
    by_payment: Array<{ method: string; count: number; amount: number }>;
  };
}

export async function getTicketDetail(ticketId: string) {
  if (!supabase) throw new Error("Supabase chưa cấu hình");
  await ensureOrgContext();

  const { data, error } = await supabase.rpc("get_ticket_detail_secure", {
    p_ticket_id: ticketId,
  });

  if (error) throw error;
  if (!data) throw new Error("Không có dữ liệu ticket");

  const payload = data as {
    ticket: { id: string; created_at: string; status: string; totals_json?: { subtotal?: number; vat_total?: number; grand_total?: number } };
    customer?: { name?: string; phone?: string };
    payment?: { method?: string; amount?: number; status?: string; created_at?: string };
    receipt?: { public_token?: string; expires_at?: string };
    items?: Array<{ qty: number; unit_price: number; vat_rate: number; service_name: string }>;
  };

  return {
    ticket: payload.ticket,
    customer: payload.customer ?? null,
    payment: payload.payment ?? null,
    receipt: payload.receipt ?? null,
    items: payload.items ?? [],
  };
}
