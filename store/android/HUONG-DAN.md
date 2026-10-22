# Đưa “Hôm nay làm gì?” lên Google Play: việc của Sếp

Em đã làm sẵn: dự án app Android (`android/`), file AAB đã ký, APK bản thử, khóa ký, ảnh và nội dung trang ứng dụng (thư mục này), trang chính sách quyền riêng tư (`/rieng-tu`) và file `/.well-known/assetlinks.json` trên web.

## 0. Thử ngay trên điện thoại Android (không cần tài khoản)
1. Chép `homnaylamgi-thu.apk` vào điện thoại và mở nó. Máy hỏi thì cho phép “Cài ứng dụng không rõ nguồn gốc”.
2. App “HNLG thử” mở trang homnaylamgi.vercel.app toàn màn hình. Giữ lâu biểu tượng sẽ thấy hai phím tắt “Rút quẻ” và “Ăn gì”.
3. Thử xong thì gỡ. Bản thử là gói riêng, không ảnh hưởng bản chính.

## 1. Điều kiện trước khi phát hành
- homnaylamgi.com phải chạy HTTPS, tức là xong bước Hostinger. App bản chính mở đúng tên miền này.
- Tạo hộp thư **hotro@homnaylamgi.com** (hPanel → Email). Ngày 23/10/2026 tên miền chưa có bản ghi MX, nên thư gửi tới địa chỉ này sẽ bị trả lại.
- Mở thử https://homnaylamgi.com/.well-known/assetlinks.json và https://homnaylamgi.com/rieng-tu, cả hai phải hiện được.

## 2. Tạo tài khoản Google Play Console (Sếp tự làm, em không được nhập thông tin thanh toán)
1. Vào https://play.google.com/console/signup và chọn loại **Tổ chức** (Organization), đứng tên CÔNG TY TNHH MINH MINH HƯNG YÊN.
2. Phí 25 USD, trả một lần, bằng thẻ Visa hoặc Mastercard đứng tên công ty hoặc Sếp.
3. Xác minh danh tính và doanh nghiệp theo yêu cầu của Google, mất vài ngày.

## 3. Tạo app và tải lên
1. Tạo ứng dụng: tên “Hôm nay làm gì?”, ngôn ngữ mặc định Tiếng Việt, loại Ứng dụng, Miễn phí.
2. Điền trang thông tin theo `listing-vi.md` và tải ảnh trong thư mục này.
3. Điền các khai báo theo `khai-bao-play-console.md` (Sếp duyệt lại trước khi gửi).
4. Kiểm thử nội bộ (Internal testing) → Tạo bản phát hành → tải lên `homnaylamgi-1.0.0.aab`. Đồng ý dùng “Play App Signing” (Google giữ khóa ký app; khóa của mình chỉ là khóa tải lên).
5. Vào **Tính toàn vẹn của ứng dụng** (App integrity), chép dấu vân tay **SHA-256 của khóa ký ứng dụng** gửi em. Em thêm vào assetlinks.json; thiếu bước này thì app hiện thanh địa chỉ ở trên cùng.
6. Thêm email người thử (có thể là chính Sếp), cài qua đường link thử nội bộ.
7. Ổn thì chuyển lên Chính thức (Production) và gửi duyệt.

## 4. Giữ khóa ký cẩn thận
- `upload-keystore.jks` và mật khẩu đi kèm là “con dấu” của app. Lưu ở chỗ an toàn (trình quản lý mật khẩu, ổ cứng riêng). Không gửi cho ai, không đưa lên GitHub.
- Nếu mất khóa: dùng Play App Signing thì xin Google đặt lại khóa tải lên được (trong Play Console), nhưng mất thời gian.
