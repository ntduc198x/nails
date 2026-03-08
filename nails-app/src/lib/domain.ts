import { supabase } from "@/lib/supabase";

export type OrgContext = { orgId: string; branchId: string };

async function ensureOrgContext(): Promise<OrgContext> {
  if (!supabase) throw new Error("Supabase chưa cấu hình");

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

  return { orgId, branchId };
}

export async function listServices() {
  if (!supabase) return [];
  const { orgId } = await ensureOrgContext();
  const { data, error } = await supabase
    .from("services")
    .select("id,name,duration_min,base_price,vat_rate,active")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createService(input: {
  name: string;
  durationMin: number;
  basePrice: number;
  vatPercent: number;
}) {
  if (!supabase) throw new Error("Supabase chưa cấu hình");
  const { orgId } = await ensureOrgContext();

  const { error } = await supabase.from("services").insert({
    org_id: orgId,
    name: input.name,
    duration_min: input.durationMin,
    base_price: input.basePrice,
    vat_rate: input.vatPercent / 100,
    active: true,
  });
  if (error) throw error;
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

export async function listAppointments() {
  if (!supabase) return [];
  const { orgId } = await ensureOrgContext();

  const { data, error } = await supabase
    .from("appointments")
    .select("id,start_at,end_at,status,customers(name)")
    .eq("org_id", orgId)
    .order("start_at", { ascending: true })
    .limit(50);
  if (error) throw error;
  return data ?? [];
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
}

type CheckoutInput = {
  customerName: string;
  paymentMethod: "CASH" | "TRANSFER";
  lines: Array<{ serviceId: string; qty: number }>;
};

function randomToken(size = 32) {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let out = "";
  for (let i = 0; i < size; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export async function createCheckout(input: CheckoutInput) {
  if (!supabase) throw new Error("Supabase chưa cấu hình");
  if (!input.lines.length) throw new Error("Cần ít nhất 1 dịch vụ");

  const { orgId, branchId } = await ensureOrgContext();
  const customerId = await findOrCreateCustomer(orgId, input.customerName);

  const serviceIds = input.lines.map((l) => l.serviceId);
  const { data: serviceRows, error: serviceErr } = await supabase
    .from("services")
    .select("id,base_price,vat_rate")
    .in("id", serviceIds)
    .eq("org_id", orgId);
  if (serviceErr) throw serviceErr;

  const map = new Map((serviceRows ?? []).map((s) => [s.id as string, s]));

  let subtotal = 0;
  let vatTotal = 0;

  const ticketItems = input.lines.map((line) => {
    const svc = map.get(line.serviceId);
    if (!svc) throw new Error("Service không hợp lệ");
    const unit = Number(svc.base_price);
    const vatRate = Number(svc.vat_rate);
    subtotal += unit * line.qty;
    vatTotal += unit * line.qty * vatRate;

    return {
      org_id: orgId,
      service_id: line.serviceId,
      qty: line.qty,
      unit_price: unit,
      vat_rate: vatRate,
    };
  });

  const grandTotal = subtotal + vatTotal;

  const { data: ticket, error: ticketErr } = await supabase
    .from("tickets")
    .insert({
      org_id: orgId,
      branch_id: branchId,
      customer_id: customerId,
      status: "CLOSED",
      totals_json: {
        subtotal,
        discount_total: 0,
        vat_total: vatTotal,
        grand_total: grandTotal,
      },
    })
    .select("id")
    .single();
  if (ticketErr) throw ticketErr;

  const ticketId = ticket.id as string;

  const { error: itemErr } = await supabase.from("ticket_items").insert(
    ticketItems.map((i) => ({
      ...i,
      ticket_id: ticketId,
    })),
  );
  if (itemErr) throw itemErr;

  const { error: paymentErr } = await supabase.from("payments").insert({
    org_id: orgId,
    ticket_id: ticketId,
    method: input.paymentMethod,
    amount: grandTotal,
    status: "PAID",
  });
  if (paymentErr) throw paymentErr;

  const days = Number(process.env.NEXT_PUBLIC_RECEIPT_LINK_EXPIRE_DAYS ?? 30);
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

  const token = randomToken();

  const { error: receiptErr } = await supabase.from("receipts").insert({
    org_id: orgId,
    ticket_id: ticketId,
    public_token: token,
    expires_at: expiresAt,
  });
  if (receiptErr) throw receiptErr;

  return { ticketId, receiptToken: token, grandTotal };
}

export async function listRecentTickets() {
  if (!supabase) return [];
  const { orgId } = await ensureOrgContext();

  const { data, error } = await supabase
    .from("tickets")
    .select("id,status,totals_json,created_at,customers(name),receipts(public_token,expires_at)")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) throw error;
  return data ?? [];
}
