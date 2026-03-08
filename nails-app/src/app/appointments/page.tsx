import { AppShell } from "@/components/app-shell";
import { appointments } from "@/lib/mock-data";

export default function AppointmentsPage() {
  return (
    <AppShell>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Appointments</h2>
          <button className="rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white">+ New appointment</button>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <p className="mb-3 text-sm text-neutral-500">Luồng: BOOKED → CHECKED_IN → IN_PROGRESS → DONE</p>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-neutral-500">
                <tr>
                  <th className="py-2">Giờ</th>
                  <th>Khách</th>
                  <th>Dịch vụ</th>
                  <th>Thợ</th>
                  <th>Trạng thái</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {appointments.map((a) => (
                  <tr key={a.id} className="border-t border-neutral-100">
                    <td className="py-2">{a.time}</td>
                    <td>{a.customer}</td>
                    <td>{a.service}</td>
                    <td>{a.tech}</td>
                    <td>{a.status}</td>
                    <td>
                      <button className="rounded-md border px-2 py-1 text-xs">Open ticket</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
