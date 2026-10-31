# Nhận diện cử chỉ tay - Bám khớp trực tiếp

Project web đơn giản, tách file rõ ràng. Kết hợp nhận diện khuôn mặt và cử
chỉ bàn tay, không nhận diện danh tính, không gửi video lên máy chủ.

## Cấu trúc

```
face-scan-project/
  index.html        # Giao diện, video + canvas overlay
  css/style.css     # Toàn bộ CSS
  js/main.js        # Camera, MediaPipe Face/Hand Landmarker, vẽ khớp tay và cử chỉ
  README.md         # File này
```

## Cách chạy

Camera chỉ hoạt động ổn định khi chạy qua máy chủ local (localhost được
trình duyệt coi là ngữ cảnh an toàn), không nên mở trực tiếp bằng file://.

```bash
cd face-scan-project
python -m http.server 8000
```

Sau đó mở: http://localhost:8000

Hoặc dùng Live Server của VS Code.

## Deploy để người khác truy cập

Project là website tĩnh nên có thể deploy trực tiếp, không cần chạy Python trên
máy của người dùng. Hosting phải cung cấp HTTPS thì trình duyệt mới cho phép
truy cập camera.

### Cách nhanh nhất: Netlify Drop

1. Truy cập [https://app.netlify.com/drop](https://app.netlify.com/drop) và đăng
   nhập hoặc tạo tài khoản.
2. Kéo cả thư mục `face-scan-project` vào vùng thả trên trang.
3. Netlify sẽ tạo một đường dẫn dạng `https://ten-ngau-nhien.netlify.app`.
4. Gửi đường dẫn đó cho người khác. Họ mở bằng trình duyệt, bấm **Bật camera**
   và cho phép quyền webcam.

Không chỉ kéo riêng `index.html`; cần tải lên cả thư mục `css`, `js` và
`cat_meme`.

### Deploy lâu dài bằng GitHub Pages

1. Tạo một repository mới trên GitHub.
2. Tải toàn bộ các file và thư mục của project lên repository, sao cho
   `index.html` nằm ở thư mục gốc.
3. Vào **Settings → Pages**.
4. Ở **Build and deployment**, chọn **Deploy from a branch**, chọn branch
   `main` và thư mục `/ (root)`, rồi bấm **Save**.
5. Sau một lúc, GitHub tạo đường dẫn dạng
   `https://ten-tai-khoan.github.io/ten-repository/`.

Nếu dùng repository riêng tư, khả năng truy cập GitHub Pages còn phụ thuộc vào
gói tài khoản. Khi mở lần đầu, người dùng vẫn phải cấp quyền camera. Các model
MediaPipe được tải từ CDN nên thiết bị cần có Internet.

## Cách dùng

1. Bấm **Bật camera** và cho phép dùng webcam.
2. Đưa bàn tay vào camera, đủ sáng và không bị che.
3. Các điểm và đường nối landmark bàn tay bám theo từng ngón tay theo thời gian
   thực.
4. Tùy chọn:
   - **Hiện khớp bàn tay**: bật/tắt các điểm và đường nối trên bàn tay.
   - **Lật gương**: bật/tắt chế độ gương.
   - **Độ nhạy nhận diện**: kéo thấp xuống nếu tay khó nhận, kéo cao lên
     nếu hay nhận nhầm.
   - **Đổi camera trước / sau**: dùng trên điện thoại.
   - **Chụp khung hình**: tải ảnh PNG đã có khớp bàn tay.
   - Khi đưa tay vào camera, ứng dụng vẽ các điểm nối màu cam và nhận diện
     bàn tay mở, ngón cái, chỉ tay hoặc nắm tay, sau đó hiển thị meme tương ứng.
   - Khi không có bàn tay, ứng dụng nhận diện khuôn mặt bình thường hoặc biểu
     cảm chu môi.

## Ảnh theo cử chỉ

Ứng dụng đang dùng bàn tay đầu tiên để chọn ảnh. Có thể đổi ảnh hoặc ngưỡng
nhận diện trong `gestureProfiles` ở `js/main.js`:

- Bàn tay mở: `tay_tren_dau.jpg`
- Chỉ ngón trỏ: `ngon_tro.jpg`
- Suỵt: `suyt.jpg`
- Gọi điện (ngón cái + ngón út): `cai_va_tro.jpg`
- Chu môi: `tay_qua_dau.jpg`
- Khuôn mặt bình thường: `nghiem_tuc.jpg`

## Vì sao bản trước hay lỗi / landmark không bám tay

Các lỗi thường gặp đã được sửa ở bản này:

- Chỉ chạy nhận diện khi có khung hình video mới (`currentTime` thay đổi),
  và vẽ lại từ kết quả mới nhất mỗi frame, nên khung không bị đứng yên
  hay trễ so với mặt.
- Khi bật lật gương, tọa độ landmark cũng được lật theo, nên lưới khớp không
  bị lệch khỏi bàn tay trên video đã lật.
- Cử chỉ `suyt.jpg` được xác định khi đầu ngón trỏ ở gần vùng môi; cử chỉ
  `ngon_tro.jpg` là ngón trỏ nhưng không ở gần môi.
- Khi chưa thấy tay, hiện hướng dẫn để người dùng biết đưa tay vào camera.

## Yêu cầu

- Trình duyệt hiện đại, có webcam, có mạng để tải model MediaPipe lần đầu.
- Nếu báo lỗi tải model hoặc không bật được camera, kiểm tra quyền camera,
  xem camera có đang bị app khác chiếm không, và chạy qua localhost như trên.
