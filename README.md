# Hôm nay làm gì? — homnaylamgi.com

Trang web rút quẻ: mở ra là có ngay một việc nhỏ nên làm hôm nay, hợp giờ, tâm trạng, thời gian và túi tiền. Dành cho người trẻ 16–40 tuổi.

## Cấu trúc

| Đường dẫn | Nội dung |
|---|---|
| `src/data.js` | Thư viện quẻ. Sửa hoặc thêm quẻ ở đây. |
| `src/app.js` | Logic trang: rút quẻ, lọc, sao, huy hiệu, âm lịch, chia sẻ. |
| `src/style.css`, `src/body.html` | Giao diện. |
| `src/sw.js` | Service worker để trang mở được khi mất mạng. |
| `src/static/` | Ảnh chia sẻ (og-image), favicon, biểu tượng ứng dụng. |
| `tools/build.mjs` | Build ra `dist/` (bản web) và `artifact/` (bản xem trên Claude). |
| `dist/` | Bản đã build. Vercel và Hostinger dùng thư mục này. **Không sửa tay.** |
| `vercel.json` | Cấu hình Vercel, do build tạo. |

## Sửa nội dung rồi đưa lên

1. Sửa file trong `src/`.
2. Build: `cd tools && npm ci && npm run build`
3. Commit và push nhánh `main` → Vercel tự deploy.
4. Chạy `bash tools/deploy-hostinger.sh` → cập nhật nhánh `deploy` → Hostinger tự kéo về `public_html` (nếu đã bật Auto Deployment trong hPanel).

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
| `x` | Nhãn phụ: `cuoituan`, `canngay`, mùa (`xuan he thu dong`), dịp (`ram`, `vulan`, `2011`) |
| `ev` | Chỉ hiện quanh một dịp: `halloween`, `2011`, `noel`, `tet`, `trungthu`, `phunu`, `valentine`, `giadinh`, `thieunhi`, `giaothua`, `ram`, `cathangtu`, `doan`, `nghile` |

## Ghi chú kỹ thuật

- Một trang duy nhất, không cần máy chủ. Sao, huy hiệu, lịch sử lưu trong `localStorage` của từng người (khóa `hnlg.v1`).
- Font tự host (Be Vietnam Pro, Bricolage Grotesque, Fraunces; giấy phép SIL OFL), chỉ tải bộ ký tự Latin và tiếng Việt cần dùng.
- Chính sách bảo mật nội dung (CSP) nằm trong thẻ meta của `index.html`, mã băm do build tự tính. Sửa tay `dist/index.html` sẽ làm trang hỏng; luôn sửa `src/` rồi build lại.
- Âm lịch dùng thuật toán Hồ Ngọc Đức, múi giờ GMT+7.
