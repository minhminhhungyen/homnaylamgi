# App Android “Hôm nay làm gì?” (Trusted Web Activity)

App mở thẳng homnaylamgi.com toàn màn hình bằng Chrome trên máy (Trusted Web Activity). Web cập nhật là app cập nhật, không cần phát hành lại. Dự án được tạo bằng Bubblewrap 1.27 (`twa-manifest.json`).

| | Bản chính | Bản thử |
|---|---|---|
| Gói | `com.homnaylamgi.app` | `com.homnaylamgi.app.thu` |
| Mở trang | https://homnaylamgi.com | https://homnaylamgi.vercel.app |
| Dùng để | Đưa lên Google Play | Cài thử khi tên miền chính chưa chạy |

Yêu cầu Google Play: target Android 16 (API 36), đã đặt sẵn trong `app/build.gradle`.

## Build

Máy làm việc của Claude không tải được Android SDK, nên việc build chạy trên GitHub Actions (`.github/workflows/android.yml`). Mỗi lần đổi file trong `android/` và push lên `main`, workflow build bản **chưa ký** rồi đẩy sang nhánh `android-build`:

- `homnaylamgi-unsigned.aab`
- `homnaylamgi-thu-unsigned.aab`
- `bundletool.jar`

Có Android Studio thì build trực tiếp: `./gradlew bundleRelease`, thêm `-Pthu` cho bản thử.

## Ký (khóa tải lên, không bao giờ đưa vào repo)

```bash
# Ký file AAB để tải lên Google Play
jarsigner -keystore upload-keystore.jks -sigalg SHA256withRSA -digestalg SHA-256 \
  -signedjar homnaylamgi-1.0.0.aab homnaylamgi-unsigned.aab upload

# Tạo APK cài thử từ bản thử
jarsigner -keystore upload-keystore.jks -sigalg SHA256withRSA -digestalg SHA-256 -signedjar thu.aab homnaylamgi-thu-unsigned.aab upload
java -jar bundletool.jar build-apks --bundle=thu.aab --output=thu.apks --mode=universal \
  --ks=upload-keystore.jks --ks-key-alias=upload --ks-pass=pass:MAT_KHAU
unzip -p thu.apks universal.apk > homnaylamgi-thu.apk
```

## Digital Asset Links

Để app chạy toàn màn hình, không hiện thanh địa chỉ, web phải có `/.well-known/assetlinks.json` chứa dấu vân tay SHA-256 của khóa ký. File này do `tools/build.mjs` tạo từ `tools/android.json`.

Sau lần đầu tải AAB lên Google Play, Google ký lại app bằng “khóa ký ứng dụng” của họ:

1. Vào Play Console → Tính toàn vẹn của ứng dụng (App integrity).
2. Chép SHA-256 của khóa ký ứng dụng.
3. Thêm vào `tools/android.json` ở mục `com.homnaylamgi.app`.
4. Build lại và deploy web.

## Phát hành bản mới

Tăng `versionCode` (số nguyên, mỗi lần +1) và `versionName` trong `app/build.gradle` và `twa-manifest.json`, push lên `main`, ký lại AAB, tải lên Play Console.
