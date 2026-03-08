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

  const { orgId } = await ensureOrgContext();

  const { error: insertErr } = await supabase.from("user_roles").insert({
    user_id: userId,
    org_id: orgId,
    role: "OWNER",
  });
  if (insertErr) throw insertErr;

  return "OWNER";
}
