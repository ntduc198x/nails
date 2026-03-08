import { ensureOrgContext } from "@/lib/domain";
import { supabase } from "@/lib/supabase";

export type AppRole = "OWNER" | "MANAGER" | "RECEPTION" | "ACCOUNTANT" | "TECH";

export async function getOrCreateRole(userId: string): Promise<AppRole> {
  if (!supabase) throw new Error("Supabase chưa cấu hình");

  const { data: existing, error: readErr } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .limit(1);

  if (readErr) throw readErr;
  const role = existing?.[0]?.role as AppRole | undefined;
  if (role) return role;

  const { orgId, branchId } = await ensureOrgContext();

  // bootstrap profile để dùng với RLS helper my_org_id()
  const { data: profile } = await supabase.from("profiles").select("user_id").eq("user_id", userId).maybeSingle();
  if (!profile) {
    await supabase.from("profiles").insert({
      user_id: userId,
      org_id: orgId,
      default_branch_id: branchId,
      display_name: "User",
    });
  }

  const { error: insertErr } = await supabase.from("user_roles").insert({
    user_id: userId,
    org_id: orgId,
    role: "OWNER",
  });
  if (insertErr) throw insertErr;

  return "OWNER";
}

export async function listUserRoles() {
  if (!supabase) throw new Error("Supabase chưa cấu hình");
  const { orgId } = await ensureOrgContext();

  const { data, error } = await supabase
    .from("user_roles")
    .select("id,user_id,role")
    .eq("org_id", orgId)
    .order("role", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function updateUserRoleByRowId(id: string, role: AppRole) {
  if (!supabase) throw new Error("Supabase chưa cấu hình");

  const { error } = await supabase.from("user_roles").update({ role }).eq("id", id);
  if (error) throw error;
}

export async function getCurrentSessionRole(): Promise<AppRole> {
  if (!supabase) throw new Error("Supabase chưa cấu hình");
  const { data } = await supabase.auth.getSession();
  const user = data.session?.user;
  if (!user) throw new Error("Chưa đăng nhập");
  return getOrCreateRole(user.id);
}
