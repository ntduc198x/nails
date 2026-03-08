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

export async function getTicketDetail(ticketId: string) {
  if (!supabase) throw new Error("Supabase chưa cấu hình");
  const { orgId } = await ensureOrgContext();

  const { data: ticket, error: ticketErr } = await supabase
    .from("tickets")
    .select("id,created_at,status,totals_json,customer_id")
    .eq("org_id", orgId)
    .eq("id", ticketId)
    .single();
  if (ticketErr) throw ticketErr;

  const [{ data: customer }, { data: rawItems, error: itemErr }, { data: payment }, { data: receipt }] = await Promise.all([
    supabase.from("customers").select("name,phone").eq("id", ticket.customer_id).maybeSingle(),
    supabase.from("ticket_items").select("service_id,qty,unit_price,vat_rate").eq("ticket_id", ticketId),
    supabase.from("payments").select("method,amount,status,created_at").eq("ticket_id", ticketId).limit(1).maybeSingle(),
    supabase
      .from("receipts")
      .select("public_token,expires_at")
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (itemErr) throw itemErr;

  const serviceIds = Array.from(new Set((rawItems ?? []).map((i) => i.service_id).filter(Boolean)));
  let serviceNameMap = new Map<string, string>();

  if (serviceIds.length) {
    const { data: services } = await supabase.from("services").select("id,name").in("id", serviceIds);
    serviceNameMap = new Map((services ?? []).map((s) => [s.id as string, s.name as string]));
  }

  const items = (rawItems ?? []).map((i) => ({
    qty: i.qty,
    unit_price: i.unit_price,
    vat_rate: i.vat_rate,
    service_name: i.service_id ? serviceNameMap.get(i.service_id as string) ?? "(service deleted)" : "-",
  }));

  return { ticket, customer, items, payment, receipt };
}
