# Nails App

Ứng dụng vận hành tiệm nails theo hướng mobile-first, tập trung cho 3 nhóm người dùng chính:
- **Chủ tiệm / Quản lý**: quản lý dịch vụ, tài nguyên, nhân sự, báo cáo, sổ thuế
- **Lễ tân**: nhận booking online, điều phối lịch, check-in, thanh toán
- **Thợ (TECH)**: xem lịch, mở/đóng ca, xử lý khách đang phục vụ, mở phiếu thanh toán

App được xây bằng **Next.js 16 + React 19 + Supabase**.

## 1. Tính năng chính

### Landing page và booking online
- Landing page giới thiệu dịch vụ nổi bật
- Form khách tự tạo booking online
- Đẩy booking vào luồng xử lý nội bộ tại `/manage/booking-requests`

### Vận hành nội bộ
- **Booking online**: xem request mới, request cần dời lịch, convert sang lịch hẹn
- **Điều phối lịch**: tạo lịch nhanh, check-in, no-show, hủy lịch, mở phiếu
- **Thanh toán**: chọn khách đang check-in, thêm dịch vụ nhanh, tạo bill, mở link hóa đơn
- **Ca làm**: mở ca, đóng ca, xem ca đang mở, cảnh báo ca mở quá lâu

### Thiết lập
- **Dịch vụ**: thêm/sửa dịch vụ, VAT, ảnh, lookbook, active/inactive
- **Tài nguyên**: quản lý ghế / bàn / phòng
- **Nhân sự**: đổi vai trò, sửa tên, quản lý mã mời (OWNER)
- **Tài khoản**: hồ sơ cá nhân, đổi mật khẩu

### Báo cáo
- **Báo cáo doanh thu**: lọc theo ngày/tuần/tháng/tùy chỉnh, theo nhân viên, export Excel
- **Sổ thuế**: mẫu S1a-HKD, xuất Excel/PDF

## 2. Các route chính

### Public
- `/` Landing page
- `/login` Đăng nhập / tạo tài khoản
- `/receipt/[token]` Xem hóa đơn công khai

### Manage
- `/manage` Điều hướng theo vai trò
- `/manage/booking-requests` Booking online
- `/manage/appointments` Điều phối lịch
- `/manage/checkout` Thanh toán
- `/manage/shifts` Ca làm
- `/manage/services` Dịch vụ
- `/manage/resources` Tài nguyên
- `/manage/team` Nhân sự
- `/manage/account` Hồ sơ & bảo mật
- `/manage/reports` Báo cáo
- `/manage/tax-books` Sổ thuế

## 3. Cài đặt local

```bash
cd /root/.openclaw/workspace/nails-app
npm install
npm run dev
```

Mở:
- http://localhost:3000

### Build production
```bash
npm run build
npm run start
```

## 4. Biến môi trường

Tạo file `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
NEXT_PUBLIC_APP_URL=...
RESEND_API_KEY=...
RECEIPT_LINK_EXPIRE_DAYS=30
TELEGRAM_BOT_TOKEN=...
TELEGRAM_BOOKING_CHAT_ID=...
APPOINTMENT_OVERDUE_MINUTES=15
```

## 5. Khởi tạo database

Mở Supabase SQL Editor và chạy:

### Bắt buộc
- `supabase/deploy.sql`

### Các patch đang dùng thêm
- `supabase/appointments_overdue_alerts.sql`
- `supabase/booking_requests_tech_access.sql`
- `supabase/add_profile_email.sql`
- `supabase/remove_service_display_order.sql`

### Script hỗ trợ dữ liệu
- `supabase/update_services_from_priceboard.sql`

## 6. Ghi chú triển khai

- App ưu tiên **mobile-first**, đặc biệt trong khu vực `/manage`
- TECH flow hiện tập trung ở:
  - `booking-requests`
  - `appointments`
  - `checkout`
  - `shifts`
- `reports` và `tax-books` thiên về quản lý/chủ tiệm hơn

## 7. Quy ước vai trò

- **OWNER**: toàn quyền
- **MANAGER**: quản lý vận hành và thiết lập, hạn chế một số mục tài chính
- **RECEPTION**: lễ tân, điều phối, checkout
- **TECH**: thợ, tập trung lịch hẹn, ca làm, checkout
- **ACCOUNTANT**: checkout, báo cáo, sổ thuế

## 8. Trạng thái hiện tại

- Chỉ còn **1 folder app duy nhất** dưới workspace: `nails-app`
- Build hiện tại pass sạch
- Đã tối ưu mạnh cho mobile ở phần lớn màn manage
- `reports` đã có thêm vòng tối ưu mobile, nhưng vẫn là màn nên polish tiếp nếu cần

## 9. Lệnh hay dùng

```bash
npm run dev
npm run build
npm run start
```

## 10. Tài liệu quay video hướng dẫn

Em đã tạo thêm file hướng dẫn chi tiết để anh quay video cho thợ và chủ tiệm:

- `GUIDE.vi.md`
