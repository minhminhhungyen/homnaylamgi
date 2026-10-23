# Hôm nay làm gì? — homnaylamgi.com

Trang web rút quẻ: mở ra là có ngay một việc nhỏ nên làm hôm nay, hợp giờ, tâm trạng, thời gian và túi tiền. Dành cho người trẻ 16–40 tuổi.

## Cấu trúc

| Đường dẫn | Nội dung |
|---|---|
| `src/data.js` | Thư viện: 400 quẻ (`ACTIVITIES`), 80 món (`FOODS`), 12 thử thách 7 ngày (`CHALLENGES`). Sửa hoặc thêm ở đây. |
| `src/app.js` | Logic trang: rút quẻ, lọc, sao, huy hiệu, âm lịch, thời tiết, chia sẻ. |
| `src/style.css`, `src/body.html` | Giao diện. |
| `src/sw.js` | Service worker để trang mở được khi mất mạng. |
| `src/static/` | Ảnh chia sẻ chung (og-image), favicon, biểu tượng ứng dụng. |
| `src/og/` | Ảnh xem trước 1200×630 riêng từng quẻ (`q-12.png`) và từng món (`an-5.png`), do `tools/make-og.mjs` tạo. |
| `tools/build.mjs` | Build ra `dist/` (bản web, gồm trang link rủ `/q/12`, `/an/5`) và `artifact/` (bản xem trên Claude). |
| `tools/make-og.mjs` | Tạo lại ảnh xem trước trong `src/og/` (cần Playwright). |
| `dist/` | Bản đã build. Vercel và Hostinger dùng thư mục này. **Không sửa tay.** |
| `vercel.json` | Cấu hình Vercel, do build tạo. |

## Sửa nội dung rồi đưa lên

1. Sửa file trong `src/`.
2. Thêm hoặc sửa quẻ thì tạo lại ảnh xem trước: `cd tools && npm run og` (cần `npm i -D playwright && npx playwright install chromium`). Lệnh chỉ vẽ ảnh có chữ thay đổi, ghi nhớ trong `tools/og-manifest.json`; `-- --all` để vẽ lại hết. Quẻ chưa có ảnh riêng sẽ dùng ảnh chung.
3. Build: `cd tools && npm ci && npm run build`
4. Commit và push nhánh `main` → Vercel tự deploy.
5. Chạy `bash tools/deploy-hostinger.sh` → cập nhật nhánh `deploy` → Hostinger tự kéo về `public_html` (nếu đã bật Auto Deployment trong hPanel).

## Các khóa của một quẻ (`src/data.js`)

| Khóa | Ý nghĩa |
|---|---|
| `id` | Số quẻ, không trùng |
| `c` | Nhóm: `vd` vận động, `kp` khám phá, `st` sáng tạo, `hh` học hỏi, `kn` kết nối, `cm` chăm mình, `au` ăn uống, `sn` sự nghiệp, `tt` tử tế, `gt` giải trí |
| `t`, `n`, `s` | Tiêu đề, lời quẻ, bước bắt đầu |
| `p` | Số phút ước tính |
| `k` | Chi phí ước tính: 0 = 0 đồng, 1 = dưới 100k, 2 = 100k–300k, 3 = trên 300k |
| `ai` | Đi cùng: `a` một mình, `b` bạn bè, `y` người yêu, `g` gia đình |
| `o` | Nơi: `i` trong nhà, `o` ra ngoài, `b` đâu cũng được |
| `g` | Khung giờ: `s` sáng 5–11h, `c` chiều 11–17h, `t` tối 17–22h, `k` khuya 22–5h |
| `m` | Tâm trạng: `c` chán, `b` buồn, `m` mệt, `x` căng thẳng, `l` cô đơn, `h` hứng khởi |
| `d` | Độ khó 1–10 = số sao nhận được |
| `ch` | `1` = được chọn làm thử thách chung (cần có cả `s` và `t` trong `g`) |
| `x` | Nhãn phụ: `cuoituan`, `canngay`, mùa (`xuan he thu dong`), dịp (`ram`, `vulan`, `2011`), trời (`hoanghon` cần trời quang lúc mặt trời lặn, `sao` cần trời quang ban đêm) |
| `ev` | Chỉ hiện quanh một dịp: `halloween`, `2011`, `noel`, `tet`, `trungthu`, `phunu`, `valentine`, `giadinh`, `thieunhi`, `giaothua`, `ram`, `cathangtu`, `doan`, `nghile` |

Món ăn (`FOODS`) có thêm khóa `w`: `n` món nóng, ấm bụng (ưu tiên khi mưa, lạnh), `m` món mát (ưu tiên khi nóng).

Thử thách 7 ngày (`CHALLENGES`): `k` mã không trùng, `c` nhóm, `t` tên, `s` lời nhắn. Mỗi ngày bấm “Hôm nay xong” được 1 sao; đủ 7 ngày trong 14 ngày được thêm 10 sao, mở huy hiệu “Bền bỉ 7 ngày” (xong 3 thử thách: “Kiên trì”).

## Chốt chặn nội dung an toàn

- `tools/build.mjs` rà mọi quẻ, món, thử thách trước khi build. Gặp lời lẽ về tự tử, tự làm hại bản thân, nhịn ăn, nhịn ngủ, chỗ cao nguy hiểm, rượu bia, thuốc lá, vape, bóng cười, cờ bạc, cá độ, đua xe, vượt đèn đỏ thì build dừng và in ra quẻ vi phạm. Trùng số quẻ, trùng tiêu đề cũng dừng.
- Build cũng dừng nếu:
  - quẻ gắn tâm trạng Buồn/Cô đơn (`m` có `b` hoặc `l`) mà độ khó trên 6;
  - quẻ lúc khuya (`g` có `k`) mà phải ra ngoài (`o:'o'`);
  - quẻ thử thách chung (`ch:1`) khó trên 5, tốn từ 100k, hoặc thiếu khung sáng hay tối;
  - quẻ chỉ làm cùng người yêu (`ai:'y'`) mà gắn tâm trạng Buồn/Cô đơn.
- Muốn thêm từ cấm: sửa mảng `BANNED` trong `tools/build.mjs`. Không gỡ chốt chặn để build cho qua; sửa lời quẻ.
- Người chọn tâm trạng Buồn hoặc Cô đơn chỉ được gợi ý việc nhẹ (độ khó tối đa 6).
- Khuya (22–5h), ai cũng chỉ được gợi ý việc nhẹ nhàng (độ khó tối đa 3), không phải ra ngoài. Mở link rủ hoặc thử thách chung lúc khuya mà việc đó phải ra ngoài, khó hoặc không hợp giờ khuya thì hiện lời nhắc để trời sáng, để mai hãy làm. Trời đẹp lúc khuya không khuyên ra ngoài. Ăn khuya thì gợi ý gọi giao tận nhà hoặc tự làm nhanh.
- Lời quẻ cũng in lên ảnh story nên mỗi câu `n` phải đọc riêng vẫn an toàn. Nhãn `ai` (đi cùng ai) chỉ lọc khi người dùng tự chọn, nên việc cần có người đi cùng phải ghi rõ trong lời `s`.
- Ngày 23/10/2026 đã rà độc lập toàn bộ 299 quẻ, 80 món, 12 thử thách: sửa 43 quẻ (bỏ hình ảnh chỗ cao, nước, đêm khuya một mình, thư từ biệt, cho đi đồ quý; thêm lưu ý an toàn khi gặp người lạ, đi xa, chạy bộ, tuổi lái xe, tuổi hiến máu).
- Cùng ngày, rà độc lập 101 quẻ mới (300–400): sửa 29 quẻ (cảnh báo app VssID giả, dây điện đứt gọi điện lực, an toàn khi thắng đường, đi xa dưới 18 tuổi, dán đầu pin cũ, bỏ quẻ trùng ý). Số khẩn cấp 113, 114, 115 (quẻ 327) cần kiểm lại khi gộp đầu số (dự kiến 2027).
- Chọn Buồn hoặc Cô đơn thì hiện lời nhắn: kể với người bạn tin tưởng, người nhà, thầy cô hoặc gặp bác sĩ; thấy không an toàn thì gọi cấp cứu 115. Trang nhật ký và chân trang có lời nhắn tương tự. Số Admin ghi rõ là để báo lỗi trang. Trang không tư vấn tâm lý.

## Chia sẻ và link rủ

- Mỗi quẻ có link riêng `homnaylamgi.com/q/<số>`, mỗi món `homnaylamgi.com/an/<số>`. Trang này có thẻ xem trước riêng (tiêu đề, lời quẻ, ảnh) cho Facebook, Zalo, Threads, Messenger, Telegram, X; người bấm vào được chuyển ngay về trang chính, mở đúng quẻ đó, kèm dòng “Bạn bè rủ bạn…”.
- Bảng chia sẻ: Zalo, Messenger, Facebook, Instagram, TikTok, Threads, Telegram, X, Khác. Trên điện thoại dùng bảng chia sẻ của máy; Instagram, TikTok gửi ảnh story. Trên máy tính, Facebook/Threads/Telegram/X mở trang đăng bài; Zalo, Messenger chép sẵn lời rủ kèm link để dán. Zalo không có link chia sẻ công khai nếu không có Official Account, nên không dùng SDK của Zalo.
- Vercel tự hiểu `/q/12` nhờ `cleanUrls`; Hostinger dùng luật `RewriteRule` trong `.htaccess`.

## Thời tiết, không khí, tâm trạng

- Chỉ hỏi vị trí khi người dùng bấm “Gợi ý theo thời tiết chỗ bạn”; không cho thì chọn tỉnh, thành. Tọa độ làm tròn 2 chữ số (~1 km), chỉ lưu trên máy người dùng.
- Thời tiết: MET Norway Locationforecast (miễn phí, cho dùng thương mại, CC BY 4.0, phải ghi nguồn, tôn trọng `Expires`). Khi lượng truy cập lớn, MET khuyên đặt máy chủ trung gian.
- Không khí (US AQI, PM2.5) và UV: Open-Meteo Air Quality, mô hình CAMS của Copernicus, độ phân giải ~45 km (ước tính). **Miễn phí chỉ cho web phi thương mại**: nếu web có quảng cáo, thu phí hoặc dùng để quảng bá sản phẩm thì phải mua gói thương mại của Open-Meteo hoặc tắt phần này.
- Giờ mặt trời lặn và nơi gần nhất tính ngay trên máy, không gọi dịch vụ nào.
- Trời mưa, dông, không khí xấu: chỉ gợi ý quẻ trong nhà hoặc đâu cũng được (trừ khi người dùng tự chọn “Ra ngoài” ở Tinh chỉnh); trời đẹp: ưu tiên ra ngoài, vận động; nắng gắt, UV cao: tránh ra ngoài buổi trưa; gần giờ mặt trời lặn mà trời quang: gợi ý ngắm hoàng hôn; tối trời quang: ngắm sao. Món ăn: mưa, lạnh ưu tiên món nóng; nóng ưu tiên món mát.
- Tâm trạng chưa tốt: ưu tiên nhóm việc giúp vui lên, kèm câu động viên. Học theo người dùng: chấm “Vui”/“Đáng nhớ” cộng điểm nhóm việc, bấm “Rút quẻ khác” trừ nhẹ; điểm giảm dần theo ngày.

## Trang của bạn, nhật ký riêng tư

- `#toi` (nút người ở đầu trang): tên gọi, thành tích, sao lưu ra file JSON và khôi phục sang máy khác, form hỗ trợ (mở ứng dụng email, gửi tới hotro@homnaylamgi.com), xóa toàn bộ dữ liệu.
- `#nhat-ky`: nhật ký mã hóa ngay trên máy (AES-GCM 256, khóa sinh từ mật khẩu bằng PBKDF2-SHA256 600.000 vòng, mỗi trang một IV). Lưu ở `localStorage` khóa `hnlg.diary`; chỉ có bản mã hóa, không lưu mật khẩu. Quên mật khẩu thì không mở lại được. Rời trang nhật ký hoặc 10 phút không dùng thì tự khóa.
- Chưa có đăng nhập, đồng bộ nhiều máy (chờ Firebase) và gửi thư tự động (chờ Hostinger + hộp thư hotro@).

## Cài như ứng dụng, app Android

- Web cài được như app (PWA): Chrome/Edge hiện hộp cài khi bấm “Cài ứng dụng”; iPhone có hướng dẫn “Thêm vào MH chính”; trong app Zalo/Facebook có hướng dẫn mở bằng trình duyệt. Manifest có phím tắt “Rút quẻ” (`/?mode=lam`), “Ăn gì” (`/?mode=an`) và ảnh chụp màn hình (`tools/make-shots.mjs`).
- App Android (Google Play) nằm trong `android/`: Trusted Web Activity mở homnaylamgi.com toàn màn hình, gói `com.homnaylamgi.app`, target API 36. Build chưa ký trên GitHub Actions (nhánh `android-build`), ký bằng khóa tải lên giữ ngoài repo. Chi tiết: `android/README.md`.
- `/.well-known/assetlinks.json` sinh từ `tools/android.json`. Sau khi tải lên Google Play phải thêm dấu vân tay khóa ký của Google vào đó.
- Hồ sơ Google Play (ảnh, nội dung, khai báo nháp, hướng dẫn): `store/android/`.
- Trang `/rieng-tu`: Chính sách quyền riêng tư đứng tên công ty, bắt buộc khi đưa lên Google Play.

## Ghi chú kỹ thuật

- Một trang duy nhất, không cần máy chủ. Sao, huy hiệu, lịch sử lưu trong `localStorage` của từng người (khóa `hnlg.v1`).
- Font tự host (Be Vietnam Pro, Bricolage Grotesque, Fraunces; giấy phép SIL OFL), chỉ tải bộ ký tự Latin và tiếng Việt cần dùng.
- Chính sách bảo mật nội dung (CSP) nằm trong thẻ meta của `index.html`, mã băm do build tự tính. Trang chỉ được gọi ra ngoài tới `api.met.no` và `air-quality-api.open-meteo.com`. Sửa tay `dist/index.html` sẽ làm trang hỏng; luôn sửa `src/` rồi build lại.
- Âm lịch dùng thuật toán Hồ Ngọc Đức, múi giờ GMT+7.
