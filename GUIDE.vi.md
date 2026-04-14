# HƯỚNG DẪN SỬ DỤNG NAILS APP

Tài liệu này viết để anh có thể dùng trực tiếp làm kịch bản quay video hướng dẫn cho:
- **Thợ (TECH)**
- **Lễ tân / Quản lý vận hành**
- **Chủ tiệm / Quản lý**

---

# 1. TỔNG QUAN APP

Nails App có 2 phần chính:

## 1.1. Landing page
Dùng cho khách hàng:
- xem dịch vụ nổi bật
- chọn ngày giờ
- gửi booking online

## 1.2. Khu vực quản trị `/manage`
Dùng cho nội bộ tiệm:
- xử lý booking online
- điều phối lịch
- check-in khách
- thanh toán
- chấm công ca làm
- quản lý dịch vụ, tài nguyên, nhân sự
- xem báo cáo và sổ thuế

---

# 2. HƯỚNG DẪN CHO THỢ (TECH)

TECH chủ yếu dùng 4 màn:
- Booking online
- Điều phối lịch
- Thanh toán
- Ca làm

## 2.1. Đăng nhập
**Mục tiêu video:** hướng dẫn thợ vào app

### Các bước
1. Mở app
2. Vào màn `Đăng nhập`
3. Nhập email và mật khẩu
4. Bấm `Đăng nhập`
5. Hệ thống chuyển vào khu vực làm việc

### Lưu ý
- Nếu quên mật khẩu, dùng `Quên mật khẩu?`
- Nếu là tài khoản mới, cần có mã mời

---

## 2.2. Booking online
**Mục tiêu video:** thợ hiểu được booking online từ khách được xử lý thế nào

### Màn hình có gì
- Booking mới
- Booking cần dời lịch
- Khung chi tiết request đang chọn

### Luồng thao tác
1. Mở mục `Booking online`
2. Chạm vào 1 request khách vừa gửi
3. Xem:
   - tên khách
   - số điện thoại
   - giờ khách yêu cầu
   - dịch vụ khách chọn
4. Chọn lại:
   - thời gian chốt
   - thợ
   - ghế
5. Nếu hợp lệ, bấm `Tạo lịch` hoặc `Chốt giờ & tạo lịch`

### Khi nào dùng `Đánh dấu cần dời`
- khi giờ khách chọn bị trùng lịch
- khi giờ đó không đủ sức chứa
- khi cần dời sang giờ khác để phục vụ tốt hơn

### Khi nào dùng `Hủy`
- khách hủy
- thông tin booking sai / không liên lạc được

### Điều cần nhấn mạnh trong video
- booking online **chưa phải lịch chính thức**
- chỉ sau khi bấm `Tạo lịch` thì mới thành lịch hẹn nội bộ

---

## 2.3. Điều phối lịch
**Mục tiêu video:** thợ biết cách xem lịch, xử lý khách đến, mở phiếu

### Màn hình có gì
- Tạo lịch nhanh
- Danh sách lịch
- Cảnh báo lịch quá giờ
- Nhóm khách chờ check-in / chờ thanh toán

### Cách tạo lịch nhanh
1. Vào `Điều phối lịch`
2. Nhập `Tên khách`
3. Chọn `Số ghế`
4. Chọn `Thợ`
5. Nếu cần, đổi `Thời gian lịch hẹn`
6. Bấm `Tạo lịch`

### Cách check-in khách
1. Tìm đúng lịch của khách
2. Bấm `Check-in`
3. Khi check-in xong, lịch chuyển sang trạng thái đang chờ thanh toán

### Cách mở phiếu thanh toán cho khách đang làm
1. Tìm khách trạng thái `CHECKED_IN`
2. Bấm `Mở phiếu`
3. Hệ thống chuyển qua màn `Thanh toán`

### Cách xử lý lịch quá giờ
- Nếu khách không đến: bấm `No-show`
- Nếu khách hủy: bấm `Hủy`
- Nếu khách vẫn đến: bấm `Check-in`

### Điều cần nhấn mạnh trong video
- `Điều phối lịch` là màn vận hành trung tâm
- thợ có thể nhìn nhanh khách nào cần làm ngay
- khách `CHECKED_IN` là khách sẵn sàng mở bill

---

## 2.4. Thanh toán
**Mục tiêu video:** thợ biết tạo bill nhanh và đúng

### Màn hình có gì
- danh sách khách đang `CHECKED_IN`
- phần chọn khách
- phần thêm dịch vụ
- dịch vụ nhanh
- tóm tắt bill

### Luồng thao tác chuẩn
1. Vào `Thanh toán`
2. Chọn khách đang `CHECKED_IN`
3. Kiểm tra tên khách
4. Thêm dịch vụ đã làm
5. Tăng / giảm số lượng nếu cần
6. Chọn phương thức thanh toán:
   - tiền mặt
   - chuyển khoản
7. Kiểm tra tổng bill
8. Bấm thanh toán

### Dịch vụ nhanh dùng khi nào
- khách làm các combo / dịch vụ phổ biến
- muốn thêm nhanh mà không cần mở dropdown nhiều lần

### Lưu ý quan trọng
- TECH phải **mở ca** trước thì mới checkout được
- nếu chưa mở ca, app sẽ báo và yêu cầu sang màn `Ca làm`

### Điều cần nhấn mạnh trong video
- chọn đúng khách đang `CHECKED_IN`
- kiểm tra kỹ dịch vụ trước khi tạo bill
- sau khi tạo bill có thể lấy link hóa đơn

---

## 2.5. Ca làm
**Mục tiêu video:** thợ biết mở ca, đóng ca, tránh quên ca

### Màn hình có gì
- trạng thái hiện tại: đang trong ca / chưa mở ca
- nút `Mở ca`
- nút `Đóng ca`
- thống kê ca đang mở
- cảnh báo ca mở quá lâu

### Cách dùng
#### Mở ca
1. Vào `Ca làm`
2. Bấm `Mở ca`
3. Hệ thống ghi nhận giờ bắt đầu làm việc

#### Đóng ca
1. Khi hết ca hoặc xong việc
2. Vào `Ca làm`
3. Bấm `Đóng ca`

### Lưu ý cần nói rõ trong video
- quên mở ca thì không checkout được
- quên đóng ca sẽ bị cảnh báo ca mở quá lâu
- app **không tự đóng ca**, người dùng phải chủ động đóng

---

# 3. HƯỚNG DẪN CHO LỄ TÂN / VẬN HÀNH

Lễ tân thường dùng:
- Booking online
- Điều phối lịch
- Thanh toán
- Tài nguyên

## 3.1. Xử lý booking online
Làm tương tự TECH, nhưng nên nhấn mạnh:
- xem booking mới mỗi ngày
- convert booking thành lịch chính thức càng sớm càng tốt
- nếu chưa chốt được thì đánh dấu cần dời

## 3.2. Điều phối lịch trong ngày
### Mục tiêu
- tạo lịch mới cho khách gọi điện / khách walk-in
- check-in khách đến tiệm
- theo dõi khách quá giờ

### Luồng khuyên dùng
1. Vào `Điều phối lịch`
2. Kiểm tra nhóm khách quá giờ trước
3. Check-in khách đã đến
4. Tạo lịch mới nếu có khách mới
5. Khi khách làm xong, mở phiếu sang `Thanh toán`

## 3.3. Thanh toán tại quầy
### Luồng khuyên dùng
1. Chọn đúng khách đang `CHECKED_IN`
2. Chọn dịch vụ thực tế đã làm
3. Xác nhận phương thức thanh toán
4. Tạo bill
5. Gửi link hóa đơn nếu cần

## 3.4. Quản lý tài nguyên
**Mục tiêu video:** lễ tân biết cách thêm / sửa ghế bàn

### Màn hình `Tài nguyên`
Có thể:
- thêm ghế
- thêm bàn
- thêm phòng
- đổi tên
- bật / tắt active

### Luồng cơ bản
1. Vào `Ghế/Bàn`
2. Tạo mới tài nguyên
3. Chọn loại: ghế / bàn / phòng
4. Nếu có thay đổi, sửa trực tiếp trong danh sách

---

# 4. HƯỚNG DẪN CHO CHỦ TIỆM / QUẢN LÝ

Chủ tiệm sẽ quan tâm nhiều hơn đến:
- Dịch vụ
- Nhân sự
- Báo cáo
- Sổ thuế
- Hồ sơ tài khoản

## 4.1. Dịch vụ
**Mục tiêu video:** hướng dẫn cập nhật menu dịch vụ

### Có thể làm gì
- thêm dịch vụ mới
- sửa tên dịch vụ
- sửa giá
- sửa VAT
- sửa thời lượng
- thêm ảnh
- bật `Đưa lên lookbook`
- active / inactive dịch vụ

### Luồng cơ bản
1. Vào `Dịch vụ`
2. Thêm mới hoặc bấm `Sửa`
3. Cập nhật các trường cần thiết
4. Bấm `Lưu`

### Giải thích các trường
- **Tên**: tên dịch vụ hiển thị nội bộ và landing
- **Giá**: giá gốc dịch vụ
- **Phút**: thời lượng tiêu chuẩn
- **VAT**: thuế VAT áp cho dịch vụ
- **Mô tả**: mô tả ngắn cho lookbook / landing
- **Đưa lên lookbook**: cho phép xuất hiện ở landing page
- **Dịch vụ đang hoạt động**: bật/tắt để sử dụng

---

## 4.2. Nhân sự
**Mục tiêu video:** hướng dẫn quản lý nhân viên và role

### Có thể làm gì
- xem danh sách nhân sự
- sửa tên hiển thị
- đổi role
- tạo mã mời nhân sự (OWNER)
- thu hồi mã mời

### Các role
- MANAGER
- RECEPTION
- ACCOUNTANT
- TECH

### Luồng tạo mã mời
1. Vào `Nhân sự`
2. Chọn role muốn cấp
3. Nhập ghi chú nếu cần
4. Bấm `Tạo mã`
5. Gửi mã cho nhân viên mới

### Luồng chỉnh role
1. Tìm đúng nhân sự
2. Chọn role mới ở dropdown
3. Hệ thống cập nhật ngay

---

## 4.3. Báo cáo
**Mục tiêu video:** chủ tiệm xem doanh thu nhanh trên mobile

### Màn hình `Báo cáo`
Có:
- tổng bill
- subtotal
- VAT
- doanh thu
- lọc theo ngày / tuần / tháng / tùy chỉnh
- lọc theo nhân viên
- top dịch vụ
- doanh thu theo nhân viên
- bill chi tiết
- phương thức thanh toán
- giờ làm theo nhân viên
- export Excel

### Luồng xem nhanh trên mobile
1. Vào `Báo cáo`
2. Xem 4 ô tổng quan đầu trang
3. Mở `Bộ lọc nhanh` nếu muốn đổi kỳ
4. Mở `Phân tích doanh thu` khi cần xem sâu hơn
5. Xuống `Chi tiết bill` để xem bill thật
6. Nếu bill nhiều, dùng `Xem thêm bill`

### Khi nào dùng export Excel
- chốt số liệu cuối ngày
- gửi kế toán
- đối chiếu doanh thu nhân viên

---

## 4.4. Sổ thuế
**Mục tiêu video:** chủ tiệm biết xuất mẫu S1a-HKD

### Có thể làm gì
- chọn kỳ kê khai
- điền hộ kinh doanh
- MST
- địa chỉ
- địa điểm kinh doanh
- đơn vị tính
- export Excel
- export PDF

### Luồng cơ bản
1. Vào `Sổ thuế`
2. Chọn từ ngày / đến ngày
3. Điền thông tin hộ kinh doanh
4. Kiểm tra dữ liệu hệ thống tự nạp
5. Bấm `Xuất Excel` hoặc `Xuất PDF`

### Điều cần nói trong video
- đây là màn phục vụ xuất mẫu, không phải màn vận hành hằng ngày
- đổi kỳ kê khai là hệ thống tự nạp dữ liệu

---

## 4.5. Hồ sơ & bảo mật
**Mục tiêu video:** đổi thông tin cá nhân và mật khẩu

### Có thể làm gì
- đổi tên hiển thị
- đổi số điện thoại
- xem email hiện tại
- đổi mật khẩu

### Luồng đổi mật khẩu
1. Vào `Hồ sơ & bảo mật`
2. Nhập mật khẩu hiện tại
3. Nhập mật khẩu mới
4. Nhập lại mật khẩu mới
5. Bấm lưu

---

# 5. KỊCH BẢN VIDEO ĐỀ XUẤT

## Video 1, cho thợ
**Tiêu đề gợi ý:** Hướng dẫn thợ dùng Nails App trong ca làm

### Nội dung
1. Đăng nhập
2. Mở ca
3. Xem booking online
4. Xử lý lịch hẹn trong `Điều phối lịch`
5. Check-in khách
6. Mở phiếu ở `Thanh toán`
7. Tạo bill
8. Đóng ca

---

## Video 2, cho lễ tân
**Tiêu đề gợi ý:** Hướng dẫn lễ tân vận hành booking, lịch hẹn và thanh toán

### Nội dung
1. Đăng nhập
2. Xử lý booking online
3. Tạo lịch nhanh
4. Check-in khách
5. Thanh toán
6. Quản lý ghế/bàn

---

## Video 3, cho chủ tiệm
**Tiêu đề gợi ý:** Hướng dẫn chủ tiệm quản lý dịch vụ, nhân sự và báo cáo

### Nội dung
1. Quản lý dịch vụ
2. Quản lý nhân sự và mã mời
3. Xem báo cáo doanh thu
4. Xuất sổ thuế
5. Cập nhật hồ sơ tài khoản

---

# 6. CÁC LƯU Ý KHI QUAY VIDEO

## Cho thợ
- ưu tiên quay trên điện thoại
- tập trung vào thao tác ngắn, nhanh, 1 tay
- nhấn mạnh mở ca trước khi checkout

## Cho chủ tiệm
- có thể quay trên desktop hoặc tablet
- nhấn mạnh báo cáo, nhân sự, dịch vụ, sổ thuế

## Về nội dung
- dùng dữ liệu mẫu rõ ràng
- nên chuẩn bị sẵn 1 booking online, 1 khách checked-in, 1 bill mẫu
- quay theo đúng thứ tự nghiệp vụ thực tế để người xem dễ hiểu

---

# 7. TÓM TẮT SIÊU NGẮN

## Với thợ
- Mở ca
- Xem lịch
- Check-in khách
- Mở phiếu
- Thanh toán
- Đóng ca

## Với lễ tân
- Xử lý booking online
- Điều phối lịch
- Check-in
- Thanh toán
- Quản lý tài nguyên

## Với chủ tiệm
- Quản lý dịch vụ
- Quản lý nhân sự
- Xem báo cáo
- Xuất sổ thuế
- Quản lý tài khoản
