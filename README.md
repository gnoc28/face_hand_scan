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
