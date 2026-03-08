import { AppShell } from "@/components/app-shell";
import { formatVnd, services } from "@/lib/mock-data";

export default function ServicesPage() {
  return (
    <AppShell>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Dịch vụ & VAT</h2>
          <button className="rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white">+ Thêm dịch vụ</button>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-neutral-500">
                <tr>
                  <th className="py-2">Tên</th>
                  <th>Duration</th>
                  <th>Giá</th>
                  <th>VAT</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {services.map((s) => (
                  <tr key={s.id} className="border-t border-neutral-100">
                    <td className="py-2">{s.name}</td>
                    <td>{s.durationMin} phút</td>
                    <td>{formatVnd(s.price)}</td>
                    <td>{s.vatPercent}%</td>
                    <td>{s.active ? "Active" : "Inactive"}</td>
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
