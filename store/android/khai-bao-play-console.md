# Khai báo trong Play Console (bản nháp để Sếp duyệt)

Đây là đề xuất trả lời theo đúng cách app đang chạy ngày 23/10/2026. Người chịu trách nhiệm khai báo là chủ tài khoản. Nếu sau này thêm đăng nhập, quảng cáo hay công cụ đo lường thì phải khai lại.

## An toàn dữ liệu (Data safety)
- **Ứng dụng có thu thập hoặc chia sẻ dữ liệu người dùng không?** Có, chỉ một loại:
  - **Vị trí → Vị trí gần đúng (Approximate location):**
    - Thu thập (Collected): Có. Tọa độ làm tròn ~1 km được gửi từ máy người dùng tới dịch vụ thời tiết.
    - Chia sẻ (Shared): Có. Bên nhận là MET Norway (thời tiết) và Open-Meteo (chất lượng không khí). Em đề xuất khai thận trọng là có chia sẻ, vì hai bên này không xử lý dữ liệu thay mặt công ty.
    - Xử lý tạm thời (ephemeral): Không. Không kiểm soát được thời gian lưu của bên thứ ba.
    - Bắt buộc hay tùy chọn: Tùy chọn. Người dùng tự bật; không cho thì chọn tỉnh, thành.
    - Mục đích: Chức năng ứng dụng (App functionality).
  - **Thông tin cá nhân → Tên, Địa chỉ email (từ 23/10/2026, khi có tài khoản):**
    - Thu thập: Có, chỉ khi người dùng tự tạo tài khoản (email + mật khẩu hoặc Google). Chia sẻ: Không.
    - Bắt buộc hay tùy chọn: Tùy chọn. Mọi chức năng chính dùng được không cần tài khoản.
    - Mục đích: Quản lý tài khoản (Account management), Liên lạc với nhà phát triển (Developer communications).
    - Người dùng xóa được tài khoản ngay trong app (Trang của bạn → Xóa tài khoản).
  - **Mã định danh khác (User IDs):** mã tài khoản Google khi đăng nhập bằng Google. Mục đích: Quản lý tài khoản.
- Không thu thập: số điện thoại, danh bạ, ảnh, tệp, lịch sử duyệt web, định danh thiết bị, dữ liệu tài chính, sức khỏe.
- Tên gọi, tâm trạng, nhật ký (đã mã hóa) chỉ lưu và xử lý trên máy người dùng, không gửi đi đâu, nên không tính là thu thập. Form hỗ trợ chỉ mở ứng dụng email của người dùng; họ tự bấm gửi.
- **Dữ liệu có được mã hóa khi truyền không?** Có (HTTPS).
- **Người dùng có thể yêu cầu xóa dữ liệu không?** Có. Dữ liệu chỉ nằm trên máy: nút “Xóa dữ liệu” trong app, nút “Tắt thời tiết” hoặc gỡ app.
- Lưu ý: nhà cung cấp máy chủ (Vercel, Hostinger) ghi nhật ký kỹ thuật có địa chỉ IP. Điều này đã nêu trong chính sách quyền riêng tư; không có mục riêng trong Data safety.

## Phân loại nội dung (Content rating)
- Loại ứng dụng: Tất cả các loại ứng dụng khác (All Other App Types).
- Bạo lực, nội dung tình dục, ngôn ngữ thô tục, chất kích thích, cờ bạc: **Không** (đã rà 1000 quẻ, 80 món và 12 thử thách 7 ngày: không có rượu bia, thuốc lá, cá cược, đua xe; bước build tự dừng nếu nội dung có các từ này hoặc lời lẽ về tự tử, tự làm hại bản thân).
- Người dùng trò chuyện hoặc trao đổi nội dung với nhau trong app: **Không** (chỉ chia sẻ ra ngoài qua ứng dụng khác).
- Chia sẻ vị trí với người dùng khác: **Không**.
- Mua hàng trong app: **Không**.

## Đối tượng mục tiêu (Target audience)
- Nhóm tuổi: **16–17** và **18 trở lên**. Không chọn dưới 13 tuổi để không thuộc chính sách Gia đình.
- App không nhắm tới trẻ em.

## Mục khác
- Quảng cáo: **Không** chứa quảng cáo.
- Quyền truy cập ứng dụng (App access): mọi chức năng chính dùng được ngay, **không cần đăng nhập**. Tài khoản là tùy chọn.
- Xóa tài khoản: Google Play yêu cầu link xóa tài khoản trên web; dùng https://homnaylamgi.com/#toi (mục Xóa tài khoản).
- Ứng dụng tin tức, sức khỏe, tài chính, chính phủ: **Không**.
