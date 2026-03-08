import { AppShell } from "@/components/app-shell";
import { team } from "@/lib/mock-data";

export default function TeamPage() {
  return (
    <AppShell>
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Nhân sự & Role</h2>
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <ul className="space-y-2 text-sm">
            {team.map((m) => (
              <li key={m.name} className="flex items-center justify-between rounded-lg border border-neutral-100 p-3">
                <span>{m.name}</span>
                <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs">{m.role}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-neutral-500">
            Bước tới: map role này với bảng user_roles trong Supabase + RLS policy theo org_id.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
