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
