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

  // Quy tắc signup:
  // - user đầu tiên trong org => OWNER
  // - user đăng ký sau => RECEPTION
  const { count: ownerCount, error: ownerCountErr } = await supabase
    .from("user_roles")
    .select("id", { count: "exact", head: true })
    .eq("org_id", orgId)
    .eq("role", "OWNER");
  if (ownerCountErr) throw ownerCountErr;

  const nextRole: AppRole = (ownerCount ?? 0) === 0 ? "OWNER" : "RECEPTION";

  const { error: insertErr } = await supabase.from("user_roles").insert({
    user_id: userId,
    org_id: orgId,
    role: nextRole,
  });
  if (insertErr) throw insertErr;

  return nextRole;
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

  const { data: sessionData } = await supabase.auth.getSession();
  const currentUserId = sessionData.session?.user?.id;
  if (!currentUserId) throw new Error("Chưa đăng nhập");

  const currentRole = await getOrCreateRole(currentUserId);
  if (currentRole !== "OWNER") {
    throw new Error("Chỉ OWNER mới có quyền đổi role.");
  }

  const { data: target, error: targetErr } = await supabase
    .from("user_roles")
    .select("user_id,role")
    .eq("id", id)
    .single();
  if (targetErr) throw targetErr;

  if (target.user_id === currentUserId) {
    throw new Error("Không thể tự đổi role của chính mình.");
  }

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
