# Nails App (MVP starter)

Starter app để chạy localhost cho bài toán quản lý + tính tiền quán nails.

## 1) Chạy local

```bash
cd nails-app
cp .env.example .env.local
npm install
npm run dev
```

Mở: http://localhost:3000

## 2) Kết nối Supabase

Điền vào `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
RESEND_API_KEY=...
RECEIPT_LINK_EXPIRE_DAYS=30
```

## 3) Khởi tạo DB schema

- Mở Supabase SQL Editor
- Chạy **một file duy nhất**: `supabase/deploy.sql`
- (Khuyến nghị) chạy thêm: `supabase/smoke_checkout_integrity.sql` để kiểm tra nhanh toàn vẹn checkout

## 4) Những gì đã có trong starter

- UI MVP nhiều màn:
  - `/login` (Supabase Auth)
  - `/` Dashboard
  - `/appointments`
  - `/services`
  - `/checkout`
  - `/reports`
  - `/team`
- Điều hướng mượt hơn nhờ auth-cache + data-cache (stale nhanh, refresh khi cần)
- Reports nâng cao:
  - Lọc theo khoảng ngày
  - Export CSV
  - Click vào ticket để xem detail
- Supabase client stub: `src/lib/supabase.ts`
- SQL schema hợp nhất (`supabase/deploy.sql`)
- Mock data domain: `src/lib/mock-data.ts`
- Roadmap triển khai: `ROADMAP.vi.md`

## 5) Ưu tiên build tiếp theo

1. Auth + roles + RLS (OWNER/RECEPTION/TECH)
2. Appointment -> Ticket -> Checkout flow
3. Receipt link expire + PDF
4. Email receipt qua Resend
5. Offline mode A (pending sync)

---

Nếu muốn, bước tiếp theo có thể generate luôn:
- migration SQL đầy đủ hơn
- RLS policies skeleton
- API routes/Edge Functions mẫu cho `pricing_preview` + `checkout_close_ticket`
