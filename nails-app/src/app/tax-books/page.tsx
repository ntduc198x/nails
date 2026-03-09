"use client";

import { AppShell } from "@/components/app-shell";
import { buildTaxBook, type TaxBookType, type TaxBookRow } from "@/lib/tax-books";
import { formatVnd } from "@/lib/mock-data";
import { useEffect, useState } from "react";

function toDateInput(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function toBookLabel(type: TaxBookType) {
  if (type === "S1A_HKD") return "S1a-HKD";
  if (type === "S2A_HKD") return "S2a-HKD";
  return "S3a-HKD";
}

export default function TaxBooksPage() {
  const today = new Date();
  const [fromDate, setFromDate] = useState(toDateInput(today));
  const [toDate, setToDate] = useState(toDateInput(new Date(today.getTime() + 24 * 60 * 60 * 1000)));
  const [bookType, setBookType] = useState<TaxBookType>("S1A_HKD");
  const [rows, setRows] = useState<TaxBookRow[]>([]);
  const [ownerName, setOwnerName] = useState("");
  const [address, setAddress] = useState("");
  const [taxCode, setTaxCode] = useState("");
  const [businessLocation, setBusinessLocation] = useState("");
  const [unit, setUnit] = useState("đồng");
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      setLoading(true);
      setError(null);
      const fromIso = new Date(`${fromDate}T00:00:00`).toISOString();
      const toIso = new Date(`${toDate}T00:00:00`).toISOString();
      const data = await buildTaxBook(bookType, fromIso, toIso);
      setRows(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load tax book failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const total = rows.reduce((acc, r) => acc + r.amount, 0);

  async function exportExcel() {
    try {
      setExporting(true);
      const XLSX = await import("xlsx");
      const bookLabel = toBookLabel(bookType);
      const header = [
        [`Mẫu ${bookLabel}`],
        [`Hộ, cá nhân kinh doanh: ${ownerName || "................"}`],
        [`Địa chỉ: ${address || "................"}`],
        [`Mã số thuế: ${taxCode || "................"}`],
        [`Địa điểm kinh doanh: ${businessLocation || "................"}`],
        [`Kỳ kê khai: ${fromDate} đến ${toDate}`],
        [`Đơn vị tính: ${unit}`],
        [],
        ["Ngày", "Diễn giải", "Số tiền"],
      ];
      const body = rows.map((r) => [
        new Date(r.date).toLocaleDateString("vi-VN"),
        r.description,
        r.amount,
      ]);
      const footer = [[], ["", "Tổng", total]];

      const ws = XLSX.utils.aoa_to_sheet([...header, ...body, ...footer]);
      ws["!cols"] = [{ wch: 14 }, { wch: 56 }, { wch: 18 }];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, bookLabel);
      XLSX.writeFile(wb, `${bookLabel}_${fromDate}_to_${toDate}.xlsx`);
    } finally {
      setExporting(false);
    }
  }

  async function exportPdf() {
    try {
      setExporting(true);
      const [{ default: jsPDF }, autoTableModule] = await Promise.all([
        import("jspdf"),
        import("jspdf-autotable"),
      ]);
      const autoTable = autoTableModule.default;

      const bookLabel = toBookLabel(bookType);
      const doc = new jsPDF({ orientation: "p", unit: "pt", format: "a4" });

      if (bookType === "S1A_HKD") {
        doc.setFontSize(11);
        doc.text(`HỘ, CÁ NHÂN KINH DOANH: ${ownerName || "..............."}`, 40, 40);
        doc.text(`Địa chỉ: ${address || "..............."}`, 40, 58);
        doc.text(`Mã số thuế: ${taxCode || "..............."}`, 40, 76);

        doc.text("Mẫu số S1a-HKD", 340, 40);
        doc.setFontSize(10);
        doc.text("(Kèm theo Thông tư số 152/2025/TT-BTC)", 340, 58);

        doc.setFontSize(12);
        doc.text("SỔ DOANH THU BÁN HÀNG HÓA, DỊCH VỤ", 150, 118);
        doc.setFontSize(10);
        doc.text(`Địa điểm kinh doanh: ${businessLocation || "..............."}`, 40, 138);
        doc.text(`Kỳ kê khai: ${fromDate} đến ${toDate}`, 40, 156);
        doc.text(`Đơn vị tính: ${unit}`, 40, 174);

        autoTable(doc, {
          startY: 186,
          head: [["Ngày tháng", "Diễn giải", "Số tiền"], ["A", "B", "1"]],
          body: rows.map((r) => [
            new Date(r.date).toLocaleDateString("vi-VN"),
            r.description,
            formatVnd(r.amount),
          ]),
          foot: [["", "Tổng cộng", formatVnd(total)]],
          styles: { fontSize: 9, cellPadding: 4 },
        });

        const finalY = (doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? 520;
        doc.text(`Ngày ... tháng ... năm ...`, 340, finalY + 34);
        doc.text(`NGƯỜI ĐẠI DIỆN HỘ KINH DOANH/CÁ NHÂN KINH DOANH`, 280, finalY + 52);
        doc.text(`(Ký, ghi rõ họ tên, đóng dấu nếu có)`, 330, finalY + 70);
      } else {
        doc.setFontSize(14);
        doc.text(`Mẫu ${bookLabel}`, 40, 40);
        doc.setFontSize(10);
        doc.text(`Kỳ: ${fromDate} đến ${toDate}`, 40, 58);

        autoTable(doc, {
          startY: 74,
          head: [["Ngày", "Diễn giải", "Số tiền"]],
          body: rows.map((r) => [
            new Date(r.date).toLocaleDateString("vi-VN"),
            r.description,
            formatVnd(r.amount),
          ]),
          foot: [["", "Tổng", formatVnd(total)]],
          styles: { fontSize: 9 },
        });
      }

      doc.save(`${bookLabel}_${fromDate}_to_${toDate}.pdf`);
    } finally {
      setExporting(false);
    }
  }

  return (
    <AppShell>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-2xl font-bold">Sổ thuế HKD (S1a / S2a / S3a)</h2>
          <div className="flex flex-wrap items-center gap-2">
            <select className="rounded border px-2 py-1 text-sm" value={bookType} onChange={(e) => setBookType(e.target.value as TaxBookType)}>
              <option value="S1A_HKD">Mẫu S1a-HKD</option>
              <option value="S2A_HKD">Mẫu S2a-HKD</option>
              <option value="S3A_HKD">Mẫu S3a-HKD</option>
            </select>
            <input className="rounded border px-2 py-1 text-sm" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            <input className="rounded border px-2 py-1 text-sm" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            <button className="rounded border px-3 py-2 text-sm" onClick={load}>Nạp dữ liệu</button>
            <button
              className="rounded border px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
              onClick={() => void exportExcel()}
              disabled={loading || exporting}
            >
              {exporting ? "Đang xuất..." : "Xuất Excel"}
            </button>
            <button
              className="rounded border px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
              onClick={() => void exportPdf()}
              disabled={loading || exporting}
            >
              {exporting ? "Đang xuất..." : "Xuất PDF"}
            </button>
            <button className="rounded border px-3 py-2 text-sm" onClick={() => window.print()}>In mẫu</button>
          </div>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Mẫu S2a/S3a hiện đang map dữ liệu vận hành để tiện in nháp. Nếu anh muốn đúng 100% biểu mẫu nghiệp vụ kế toán,
          em sẽ chốt lại mapping cột theo mẫu anh đang dùng và bổ sung trường còn thiếu.
        </div>

        <div className="grid gap-2 rounded-2xl bg-white p-4 shadow-sm md:grid-cols-2">
          <input className="rounded border px-3 py-2 text-sm" placeholder="Hộ, cá nhân kinh doanh" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} />
          <input className="rounded border px-3 py-2 text-sm" placeholder="Mã số thuế" value={taxCode} onChange={(e) => setTaxCode(e.target.value)} />
          <input className="rounded border px-3 py-2 text-sm md:col-span-2" placeholder="Địa chỉ" value={address} onChange={(e) => setAddress(e.target.value)} />
          <input className="rounded border px-3 py-2 text-sm" placeholder="Địa điểm kinh doanh" value={businessLocation} onChange={(e) => setBusinessLocation(e.target.value)} />
          <input className="rounded border px-3 py-2 text-sm" placeholder="Đơn vị tính" value={unit} onChange={(e) => setUnit(e.target.value)} />
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm">
          {error && <p className="mb-3 text-sm text-red-600">Lỗi: {error}</p>}
          {loading ? (
            <p className="text-sm text-neutral-500">Đang tải...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-neutral-500">
                  <tr>
                    <th className="py-2">Ngày</th>
                    <th>Diễn giải</th>
                    <th>Số tiền</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, idx) => (
                    <tr key={`${r.date}-${idx}`} className="border-t border-neutral-100">
                      <td className="py-2">{new Date(r.date).toLocaleDateString("vi-VN")}</td>
                      <td>{r.description}</td>
                      <td>{formatVnd(r.amount)}</td>
                    </tr>
                  ))}
                  {!rows.length && (
                    <tr className="border-t border-neutral-100">
                      <td className="py-2 text-neutral-500" colSpan={3}>Không có dữ liệu trong khoảng thời gian đã chọn.</td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-neutral-200 font-semibold">
                    <td className="py-2" colSpan={2}>Tổng</td>
                    <td>{formatVnd(total)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
