# Khai báo trong Play Console (bản nháp để Sếp duyệt)

Đây là đề xuất trả lời theo đúng cách app đang chạy ngày 02/11/2026. Người chịu trách nhiệm khai báo là chủ tài khoản. Nếu sau này bật lại tài khoản người dùng, thêm quảng cáo hay công cụ đo lường khác thì phải khai lại.

## An toàn dữ liệu (Data safety)
- **Ứng dụng có thu thập hoặc chia sẻ dữ liệu người dùng không?** Có, hai loại:
  - **Vị trí → Vị trí gần đúng (Approximate location):**
    - Thu thập (Collected): Có. Tọa độ làm tròn khoảng 1 km được gửi từ máy người dùng tới dịch vụ thời tiết.
    - Chia sẻ (Shared): Có. Bên nhận là MET Norway (thời tiết) và Open-Meteo (chất lượng không khí). Em đề xuất khai thận trọng là có chia sẻ, vì hai bên này không xử lý dữ liệu thay mặt công ty.
    - Xử lý tạm thời (ephemeral): Không. Không kiểm soát được thời gian lưu của bên thứ ba.
    - Bắt buộc hay tùy chọn: Tùy chọn. Người dùng tự bật; không cho thì chọn tỉnh, thành.
    - Mục đích: Chức năng ứng dụng (App functionality).
  - **Hoạt động trong ứng dụng → Lịch sử tương tác trong ứng dụng (App interactions):**
    - Thu thập: Có. Mỗi lượt dùng gửi về máy chủ của công ty các con số tổng (mở trang, rút quẻ, rút món, nhận, xong, bật món chay…).
    - Không kèm cookie, mã định danh, nội dung quẻ hay món; máy chủ chỉ cộng vào tổng theo ngày, không lưu IP.
    - Chia sẻ: Không. Liên kết với người dùng: Không.
    - Bắt buộc hay tùy chọn: người dùng tắt được bằng cài đặt chặn theo dõi của trình duyệt (Global Privacy Control, Do Not Track).
    - Mục đích: Phân tích (Analytics).
- **Không còn thu thập** tên, email, mật khẩu hay mã tài khoản Google: từ 02/11/2026 app không mở tài khoản người dùng, không đồng bộ.
- Không thu thập: số điện thoại, danh bạ, ảnh, tệp, lịch sử duyệt web, định danh thiết bị, dữ liệu tài chính, sức khỏe.
- Lịch sử, để dành, tên gọi, tâm trạng, bộ lọc, nhật ký cũ (đã mã hóa) chỉ lưu trên máy, không gửi đi đâu. Form hỗ trợ chỉ mở ứng dụng email của người dùng; họ tự bấm gửi.
- **Dữ liệu có được mã hóa khi truyền không?** Có (HTTPS).
- **Người dùng có thể yêu cầu xóa dữ liệu không?** Có. Dữ liệu chỉ nằm trên máy: nút “Xóa dữ liệu” trong app, nút “Tắt thời tiết” hoặc gỡ app. Số đếm ẩn danh không gắn với ai nên không có gì để xóa theo từng người.
- Lưu ý: nhà cung cấp máy chủ (Vercel, Hostinger) ghi nhật ký kỹ thuật có địa chỉ IP. Điều này đã nêu trong chính sách quyền riêng tư; không có mục riêng trong Data safety.

## Phân loại nội dung (Content rating)
- Loại ứng dụng: Tất cả các loại ứng dụng khác (All Other App Types).
- Bạo lực, nội dung tình dục, ngôn ngữ thô tục, chất kích thích, cờ bạc: **Không** (đã rà 2.000 quẻ và 1.018 món: không có rượu bia, thuốc lá, cá cược, đua xe; bước build tự dừng nếu nội dung có các từ này hoặc lời lẽ về tự tử, tự làm hại bản thân).
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
