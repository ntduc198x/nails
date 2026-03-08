const kpi = [
  { label: "Lịch hẹn hôm nay", value: "12" },
  { label: "Khách đang chờ", value: "3" },
  { label: "Doanh thu tạm tính", value: "7.850.000đ" },
  { label: "Tip tạm tính", value: "940.000đ" },
];

const appointments = [
  { time: "09:00", customer: "Linh", service: "Gel + Add-on", tech: "Hà", status: "Đã check-in" },
  { time: "10:30", customer: "Trang", service: "Pedicure", tech: "Mai", status: "Đang làm" },
  { time: "11:15", customer: "Nhi", service: "Combo Spa", tech: "Hà", status: "Đặt lịch" },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-neutral-50 p-6 text-neutral-900 md:p-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="rounded-2xl bg-white p-6 shadow-sm">
          <p className="text-sm text-neutral-500">Nails App · iPad-first POS</p>
          <h1 className="mt-2 text-2xl font-bold">Bảng điều khiển vận hành</h1>
          <p className="mt-2 text-sm text-neutral-600">
            Bản khởi tạo để test localhost. Bước tiếp theo: nối Supabase, auth role, ticket/checkout, offline queue.
          </p>
        </header>

        <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {kpi.map((item) => (
            <div key={item.label} className="rounded-2xl bg-white p-4 shadow-sm">
              <p className="text-sm text-neutral-500">{item.label}</p>
              <p className="mt-2 text-xl font-semibold">{item.value}</p>
            </div>
          ))}
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl bg-white p-4 shadow-sm md:col-span-2">
            <h2 className="text-lg font-semibold">Lịch hẹn hôm nay</h2>
            <div className="mt-4 overflow-x-auto">
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
                    <tr key={`${a.time}-${a.customer}`} className="border-t border-neutral-100">
                      <td className="py-3">{a.time}</td>
                      <td>{a.customer}</td>
                      <td>{a.service}</td>
                      <td>{a.tech}</td>
                      <td>{a.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <aside className="space-y-4">
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <h3 className="font-semibold">Checklist build</h3>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-neutral-700">
                <li>Auth + role: owner/reception/tech</li>
                <li>Appointment-first + walk-in</li>
                <li>Ticket + checkout (VAT theo dịch vụ)</li>
                <li>Receipt link có expire + PDF</li>
                <li>Email qua Resend</li>
              </ul>
            </div>
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <h3 className="font-semibold">Lệnh chạy local</h3>
              <code className="mt-3 block rounded-lg bg-neutral-900 p-3 text-xs text-neutral-100">
                npm install{"\n"}
                npm run dev
              </code>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
