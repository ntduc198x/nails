"use client";

import { AppShell } from "@/components/app-shell";
import { buildTaxBook, type TaxBookRow } from "@/lib/tax-books";
import { formatVnd } from "@/lib/mock-data";
import { useEffect, useRef, useState } from "react";

function toDateInput(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function toBookLabel() {
  return "S1a-HKD";
}

export default function TaxBooksPage() {
  const today = new Date();
  const [fromDate, setFromDate] = useState(toDateInput(today));
  const [toDate, setToDate] = useState(toDateInput(new Date(today.getTime() + 24 * 60 * 60 * 1000)));
  const [rows, setRows] = useState<TaxBookRow[]>([]);
  const [ownerName, setOwnerName] = useState("");
  const [address, setAddress] = useState("");
  const [taxCode, setTaxCode] = useState("");
  const [businessLocation, setBusinessLocation] = useState("");
  const [unit, setUnit] = useState("đồng");
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const printRef = useRef<HTMLDivElement | null>(null);

  async function load() {
    try {
      setLoading(true);
      setError(null);
      const fromIso = new Date(`${fromDate}T00:00:00`).toISOString();
      const toIso = new Date(`${toDate}T00:00:00`).toISOString();
      const data = await buildTaxBook("S1A_HKD", fromIso, toIso);
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
      const bookLabel = toBookLabel();
      const header = [
        [`Mẫu ${bookLabel}`],
        [`Hộ, cá nhân kinh doanh: ${ownerName || "................"}`],
        [`Địa chỉ: ${address || "................"}`],
        [`Mã số thuế: ${taxCode || "................"}`],
        [`Địa điểm kinh doanh: ${businessLocation || "................"}`],
        [`Kỳ kê khai: ${fromDate} đến ${toDate}`],
        [`Đơn vị tính: ${unit}`],
        [],
        ["Ngày tháng", "Diễn giải", "Số tiền"],
        ["A", "B", "1"],
      ];
      const body = rows.map((r) => [
        new Date(r.date).toLocaleDateString("vi-VN"),
        r.description,
        r.amount,
      ]);
      while (body.length < 18) body.push(["", "", ""]);
      const footer = [[], ["", "Tổng cộng", total], [], ["", "Ngày ... tháng ... năm ...", ""], ["", "Người đại diện HKD/CNKD", ""]];

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
      if (!printRef.current) return;

      const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
        import("jspdf"),
        import("html2canvas"),
      ]);

      const bookLabel = toBookLabel();

      try {
        const canvas = await html2canvas(printRef.current, {
          scale: 2,
          useCORS: true,
          backgroundColor: "#ffffff",
          onclone: (clonedDoc) => {
            // Remove Tailwind styles using oklch/lab to avoid parser crash in html2canvas
            clonedDoc.querySelectorAll('style, link[rel="stylesheet"]').forEach((el) => el.remove());

            const style = clonedDoc.createElement("style");
            style.textContent = `
              #tax-book-export-root { font-family: Arial, Helvetica, sans-serif; color: #111; background: #fff; padding: 16px; }
              #tax-book-export-root table { width: 100%; border-collapse: collapse; font-size: 12px; }
              #tax-book-export-root th, #tax-book-export-root td { border: 1px solid #333; padding: 6px 8px; }
              #tax-book-export-root thead th { background: #f3f4f6; font-weight: 700; }
              #tax-book-export-root tfoot td { font-weight: 700; }
              #tax-book-export-root .amount { text-align: right; white-space: nowrap; }
              #tax-book-export-root .right { text-align: right; }
              #tax-book-export-root .center { text-align: center; }
            `;
            clonedDoc.head.appendChild(style);
          },
        });

        const imgData = canvas.toDataURL("image/png");
        const pdf = new jsPDF({ orientation: "p", unit: "pt", format: "a4" });
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();

        const imgWidth = pageWidth - 40;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        let heightLeft = imgHeight;
        let position = 20;

        pdf.addImage(imgData, "PNG", 20, position, imgWidth, imgHeight);
        heightLeft -= pageHeight - 40;

        while (heightLeft > 0) {
          pdf.addPage();
          position = 20 - (imgHeight - heightLeft);
          pdf.addImage(imgData, "PNG", 20, position, imgWidth, imgHeight);
          heightLeft -= pageHeight - 40;
        }

        pdf.save(`${bookLabel}_${fromDate}_to_${toDate}.pdf`);
        return;
      } catch {
        // Fallback when browser/css has unsupported color functions (e.g. lab/oklch)
        const autoTableModule = await import("jspdf-autotable");
        const autoTable = autoTableModule.default;
        const pdf = new jsPDF({ orientation: "p", unit: "pt", format: "a4" });

        pdf.setFontSize(12);
        pdf.text(`Mẫu ${bookLabel}`, 40, 40);
        pdf.setFontSize(10);
        pdf.text(`Hộ/CNKD: ${ownerName || "..............."}`, 40, 58);
        pdf.text(`MST: ${taxCode || "..............."}`, 40, 74);
        pdf.text(`Kỳ kê khai: ${fromDate} đến ${toDate}`, 40, 90);
        pdf.text(`Đơn vị tính: ${unit}`, 40, 106);

        autoTable(pdf, {
          startY: 120,
          head: [["Ngày tháng", "Diễn giải", "Số tiền"], ["A", "B", "1"]],
          body: rows.map((r) => [
            new Date(r.date).toLocaleDateString("vi-VN"),
            r.description,
            formatVnd(r.amount),
          ]),
          foot: [["", "Tổng cộng", formatVnd(total)]],
          styles: { fontSize: 9 },
          columnStyles: {
            0: { cellWidth: 95 },
            1: { cellWidth: 280 },
            2: { cellWidth: 120, halign: "right" },
          },
        });

        pdf.save(`${bookLabel}_${fromDate}_to_${toDate}.pdf`);
      }
    } finally {
      setExporting(false);
    }
  }

  return (
    <AppShell>
      <div className="page-shell">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="page-title">Sổ thuế HKD - Mẫu S1a</h2>
          <div className="flex flex-wrap items-center gap-2">
            <input className="btn btn-outline px-2 py-1 text-sm" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            <input className="btn btn-outline px-2 py-1 text-sm" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            <button className="btn btn-outline" onClick={load}>Nạp dữ liệu</button>
            <button
              className="btn btn-outline disabled:cursor-not-allowed disabled:opacity-60"
              onClick={() => void exportExcel()}
              disabled={loading || exporting}
            >
              {exporting ? "Đang xuất..." : "Xuất Excel"}
            </button>
            <button
              className="btn btn-outline disabled:cursor-not-allowed disabled:opacity-60"
              onClick={() => void exportPdf()}
              disabled={loading || exporting}
            >
              {exporting ? "Đang xuất..." : "Xuất PDF"}
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Trang này chỉ dùng cho mẫu S1a-HKD và xuất file để in/nộp thuế.
        </div>

        <div className="grid gap-2 card md:grid-cols-2">
          <input className="btn btn-outline" placeholder="Hộ, cá nhân kinh doanh" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} />
          <input className="btn btn-outline" placeholder="Mã số thuế" value={taxCode} onChange={(e) => setTaxCode(e.target.value)} />
          <input className="btn btn-outline md:col-span-2" placeholder="Địa chỉ" value={address} onChange={(e) => setAddress(e.target.value)} />
          <input className="btn btn-outline" placeholder="Địa điểm kinh doanh" value={businessLocation} onChange={(e) => setBusinessLocation(e.target.value)} />
          <input className="btn btn-outline" placeholder="Đơn vị tính" value={unit} onChange={(e) => setUnit(e.target.value)} />
        </div>

        <div id="tax-book-export-root" ref={printRef} className="card">
          <div className="mb-4 text-sm leading-6">
            <div className="flex justify-between gap-4">
              <div>
                <p><strong>HỘ, CÁ NHÂN KINH DOANH:</strong> {ownerName || "..............."}</p>
                <p><strong>Địa chỉ:</strong> {address || "..............."}</p>
                <p><strong>Mã số thuế:</strong> {taxCode || "..............."}</p>
              </div>
              <div className="text-right">
                <p><strong>Mẫu số {toBookLabel()}</strong></p>
                <p>(Kèm theo Thông tư số 152/2025/TT-BTC)</p>
              </div>
            </div>
            <p className="mt-3 text-center text-base font-semibold">SỔ DOANH THU BÁN HÀNG HÓA, DỊCH VỤ</p>
            <p><strong>Địa điểm kinh doanh:</strong> {businessLocation || "..............."}</p>
            <p><strong>Kỳ kê khai:</strong> {fromDate} đến {toDate}</p>
            <p><strong>Đơn vị tính:</strong> {unit}</p>
          </div>

          {error && <p className="mb-3 text-sm text-red-600">Lỗi: {error}</p>}
          {loading ? (
            <p className="text-sm text-neutral-500">Đang tải...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-neutral-600">
                  <tr>
                    <th className="py-2">Ngày tháng</th>
                    <th>Diễn giải</th>
                    <th>Số tiền</th>
                  </tr>
                  <tr>
                    <th className="py-1">A</th>
                    <th>B</th>
                    <th>1</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, idx) => (
                    <tr key={`${r.date}-${idx}`} className="border-t border-neutral-100">
                      <td className="py-2">{new Date(r.date).toLocaleDateString("vi-VN")}</td>
                      <td>{r.description}</td>
                      <td className="amount">{formatVnd(r.amount)}</td>
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
                    <td className="amount">{formatVnd(total)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          <div className="mt-12 text-right text-sm leading-6">
            <p>Ngày ... tháng ... năm ...</p>
            <p><strong>NGƯỜI ĐẠI DIỆN HỘ KINH DOANH/CÁ NHÂN KINH DOANH</strong></p>
            <p>(Ký, ghi rõ họ tên, đóng dấu nếu có)</p>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
