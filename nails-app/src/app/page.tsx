import { AppShell } from "@/components/app-shell";
import { appointments, formatVnd, me } from "@/lib/mock-data";

const kpi = [
  { label: "Lịch hẹn hôm nay", value: "12" },
  { label: "Khách đang chờ", value: "3" },
  { label: "Doanh thu tạm tính", value: formatVnd(7850000) },
  { label: "Tip tạm tính", value: formatVnd(940000) },
];

export default function Home() {
  return (
    <AppShell>
      <div className="space-y-5">
        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <p className="text-sm text-neutral-500">Đăng nhập: {me.name}</p>
          <h2 className="text-2xl font-bold">Bảng điều khiển vận hành</h2>
          <p className="mt-2 text-sm text-neutral-600">
            Tiếp theo: nối Supabase Auth + tạo CRUD thật cho Appointment và Services.
          </p>
        </section>

        <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {kpi.map((item) => (
            <div key={item.label} className="rounded-2xl bg-white p-4 shadow-sm">
              <p className="text-sm text-neutral-500">{item.label}</p>
              <p className="mt-2 text-xl font-semibold">{item.value}</p>
            </div>
          ))}
        </section>

        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold">Lịch hẹn gần nhất</h3>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-neutral-500">
                <tr>
                  <th className="py-2">Giờ</th>
                  <th>Khách</th>
                  <th>Dịch vụ</th>
                  <th>Thợ</th>
                  <th>Trạng thái</th>
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
