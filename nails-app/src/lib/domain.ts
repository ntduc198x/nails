import { supabase } from "@/lib/supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";

export type OrgContext = { orgId: string; branchId: string };

const TTL = 30_000;

let orgContextCache: { value: OrgContext; at: number } | null = null;
let servicesCache: { value: unknown[]; at: number } | null = null;
let appointmentsCache: { value: unknown[]; at: number } | null = null;
let ticketsCache: { value: unknown[]; at: number } | null = null;

function isFresh(cache: { at: number } | null, ttl = TTL) {
  return !!cache && Date.now() - cache.at < ttl;
}

function invalidateDataCaches() {
  appointmentsCache = null;
  ticketsCache = null;
}

export async function ensureOrgContext(opts?: { force?: boolean }): Promise<OrgContext> {
  if (!supabase) throw new Error("Supabase chưa cấu hình");

  if (!opts?.force && isFresh(orgContextCache, 5 * 60_000)) {
    return orgContextCache!.value;
  }

  const { data: orgs, error: orgErr } = await supabase.from("orgs").select("id").limit(1);
  if (orgErr) throw orgErr;

  let orgId = orgs?.[0]?.id as string | undefined;

  if (!orgId) {
    const { data: newOrg, error } = await supabase
      .from("orgs")
      .insert({ name: "Nails Demo Org" })
      .select("id")
      .single();
    if (error) throw error;
    orgId = newOrg.id;
  }

  const { data: branches, error: branchErr } = await supabase
    .from("branches")
    .select("id")
    .eq("org_id", orgId)
    .limit(1);
  if (branchErr) throw branchErr;

  let branchId = branches?.[0]?.id as string | undefined;

  if (!branchId) {
    const { data: newBranch, error } = await supabase
      .from("branches")
      .insert({ org_id: orgId, name: "Chi nhánh chính", timezone: "Asia/Bangkok", currency: "VND" })
      .select("id")
      .single();
    if (error) throw error;
    branchId = newBranch.id;
  }

  if (!orgId || !branchId) {
    throw new Error("Không thể khởi tạo org/branch context");
  }

  const ctx = { orgId, branchId };
  orgContextCache = { value: ctx, at: Date.now() };
  return ctx;
}

export async function listServices(opts?: { force?: boolean }) {
  if (!supabase) return [];
  if (!opts?.force && isFresh(servicesCache)) return servicesCache!.value;

  const { orgId } = await ensureOrgContext();
  const { data, error } = await supabase
    .from("services")
    .select("id,name,duration_min,base_price,vat_rate,active")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  const rows = data ?? [];
  servicesCache = { value: rows, at: Date.now() };
  return rows;
}

export async function createService(input: {
  name: string;
  durationMin: number;
  basePrice: number;
  vatPercent: number;
}) {
  if (!supabase) throw new Error("Supabase chưa cấu hình");
  const { orgId } = await ensureOrgContext();

  const { data, error } = await supabase
    .from("services")
    .insert({
      org_id: orgId,
      name: input.name,
      duration_min: input.durationMin,
      base_price: input.basePrice,
      vat_rate: input.vatPercent / 100,
      active: true,
    })
    .select("id,name,duration_min,base_price,vat_rate,active")
    .single();
  if (error) throw error;

  if (servicesCache) {
    servicesCache = { value: [data, ...(servicesCache.value as unknown[])], at: Date.now() };
  }

  return data;
}

async function findOrCreateCustomer(orgId: string, name: string) {
  if (!supabase) throw new Error("Supabase chưa cấu hình");

  const { data: existing, error: findErr } = await supabase
    .from("customers")
    .select("id")
    .eq("org_id", orgId)
    .eq("name", name)
    .limit(1);
  if (findErr) throw findErr;
  if (existing?.[0]?.id) return existing[0].id as string;

  const { data: created, error: createErr } = await supabase
    .from("customers")
    .insert({ org_id: orgId, name })
    .select("id")
    .single();
  if (createErr) throw createErr;
  return created.id as string;
}

export async function listAppointments(opts?: { force?: boolean }) {
  if (!supabase) return [];
  if (!opts?.force && isFresh(appointmentsCache)) return appointmentsCache!.value;

  const { orgId } = await ensureOrgContext();

  const { data, error } = await supabase
    .from("appointments")
    .select("id,start_at,end_at,status,customers(name)")
    .eq("org_id", orgId)
    .order("start_at", { ascending: true })
    .limit(50);
  if (error) throw error;
  const rows = data ?? [];
  appointmentsCache = { value: rows, at: Date.now() };
  return rows;
}

export async function createAppointment(input: {
  customerName: string;
  startAt: string;
  endAt: string;
}) {
  if (!supabase) throw new Error("Supabase chưa cấu hình");
  const { orgId, branchId } = await ensureOrgContext();

  const customerId = await findOrCreateCustomer(orgId, input.customerName);

  const { error } = await supabase.from("appointments").insert({
    org_id: orgId,
    branch_id: branchId,
    customer_id: customerId,
    start_at: input.startAt,
    end_at: input.endAt,
    status: "BOOKED",
  });

  if (error) throw error;
  invalidateDataCaches();
}

export async function updateAppointmentStatus(appointmentId: string, status: "BOOKED" | "CHECKED_IN" | "DONE" | "CANCELLED" | "NO_SHOW") {
  if (!supabase) throw new Error("Supabase chưa cấu hình");
  const { orgId } = await ensureOrgContext();

  const { error } = await supabase
    .from("appointments")
    .update({ status })
    .eq("id", appointmentId)
    .eq("org_id", orgId);

  if (error) throw error;
  invalidateDataCaches();
}

type CheckoutInput = {
  customerName: string;
  paymentMethod: "CASH" | "TRANSFER";
  lines: Array<{ serviceId: string; qty: number }>;
  appointmentId?: string;
  dedupeWindowMs?: number;
  idempotencyKey?: string;
};

export async function createCheckout(input: CheckoutInput) {
  if (!supabase) throw new Error("Supabase chưa cấu hình");
  if (!input.lines.length) throw new Error("Cần ít nhất 1 dịch vụ");

  const rpcDedupeWindowMs = input.dedupeWindowMs ?? 15000;
  const { data: rpcData, error: rpcErr } = await supabase.rpc("checkout_close_ticket_secure", {
    p_customer_name: input.customerName,
    p_payment_method: input.paymentMethod,
    p_lines: input.lines,
    p_appointment_id: input.appointmentId ?? null,
    p_dedupe_window_ms: rpcDedupeWindowMs,
    p_idempotency_key: input.idempotencyKey ?? null,
  });

  // Nếu đã deploy RPC mới: dùng kết quả atomic luôn.
  if (!rpcErr && rpcData) {
    ticketsCache = null;
    invalidateDataCaches();

    const out = rpcData as {
      ticketId: string;
      receiptToken: string;
      grandTotal: number;
      deduped: boolean;
    };

    return {
      ticketId: out.ticketId,
      receiptToken: out.receiptToken,
      grandTotal: Number(out.grandTotal ?? 0),
      deduped: Boolean(out.deduped),
    };
  }

  if (rpcErr) {
    throw rpcErr;
  }

  throw new Error("Checkout RPC không trả dữ liệu.");
}

export async function listRecentTickets(opts?: { force?: boolean }) {
  if (!supabase) return [];
  if (!opts?.force && isFresh(ticketsCache)) return ticketsCache!.value;

  const { orgId } = await ensureOrgContext();

  const { data, error } = await supabase
    .from("tickets")
    .select("id,status,totals_json,created_at,customers(name),receipts(public_token,expires_at)")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) throw error;
  const rows = data ?? [];
  ticketsCache = { value: rows, at: Date.now() };
  return rows;
}

export async function subscribeAppointmentsRealtime(onChange: () => void): Promise<RealtimeChannel | null> {
  if (!supabase) return null;
  const { orgId } = await ensureOrgContext();

  const channel = supabase
    .channel(`appointments-org-${orgId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "appointments",
        filter: `org_id=eq.${orgId}`,
      },
      () => {
        appointmentsCache = null;
        onChange();
      },
    )
    .subscribe();

  return channel;
}

export function unsubscribeRealtime(channel: RealtimeChannel | null | undefined) {
  if (!supabase || !channel) return;
  supabase.removeChannel(channel);
}
