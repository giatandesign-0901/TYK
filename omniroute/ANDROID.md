# Dùng OmniRoute trên Android (Chatbox AI)

Một app chat trên điện thoại, tự chuyển Gemini → Groq → DeepSeek khi nguồn trước hết lượt. Claude vẫn dùng app Claude riêng.

```
📱 Chatbox AI ──(Wi-Fi hoặc Internet)──► 💻 Máy tính chạy OmniRoute ──► Gemini / Groq / DeepSeek
```

## A. Chuẩn bị trên máy tính (1 lần)

| Bước | Việc làm |
|---|---|
| 1 | Cài OmniRoute theo `README.md`: `node cai-dat.mjs` |
| 2 | Muốn dùng **ngoài nhà/xưởng**: chạy `node cai-dat.mjs --tu-xa` (hoặc trả lời `c` khi script hỏi) |
| 3 | Ghi lại 2 thông tin script in ra ở cuối: **API Host** và key **`dien-thoai`** (trong `~/.omniroute/khoa-du-an.txt`) |
| 4 | Tắt chế độ ngủ của máy tính (Sleep = Never) — máy tắt/ngủ thì điện thoại không dùng được |

Chọn API Host:

| Điện thoại đang ở đâu | API Host dùng | Ví dụ |
|---|---|---|
| Cùng Wi-Fi với máy tính | Dòng **Cùng Wi-Fi** | `http://192.168.1.10:20128` |
| Bất kỳ đâu (4G, Wi-Fi khác) | Dòng **Từ xa** | `https://abc-xyz.trycloudflare.com` |

## B. Cài Chatbox AI trên Android

1. Mở **CH Play (Google Play)** → tìm **"Chatbox AI"** → **Cài đặt**.
2. Mở app → bỏ qua phần đăng nhập/gói trả phí nếu được mời (không cần).

## C. Thêm OmniRoute vào Chatbox

> Tên mục có thể khác đôi chút tùy phiên bản app; ý nghĩa các ô giữ nguyên.

1. Vào **Cài đặt (Settings)** → **Nhà cung cấp mô hình (Model Provider)**.
2. Bấm **Thêm (+ Add)** → chọn kiểu **OpenAI API Compatible** (Tương thích OpenAI API).
3. Điền:

| Ô | Giá trị |
|---|---|
| Tên (Name) | `OmniRoute` |
| API Host | API Host ở bước A3 (**không** thêm `/v1` ở cuối) |
| API Path | `/v1/chat/completions` |
| API Key | key `dien-thoai` |
| Model | Bấm **+ / Thêm model** → nhập `mien-phi` |

4. Bấm **Kiểm tra (Check)** nếu có → **Lưu (Save)**.
5. Mở cuộc trò chuyện mới → chọn model **OmniRoute / mien-phi** → gửi thử *"Xin chào"*.

## D. Dùng hằng ngày

| Tình huống | Làm gì |
|---|---|
| Bình thường | App **Claude** |
| Claude hết lượt | App **Chatbox** → model `mien-phi` |
| Chatbox báo lỗi kết nối khi ở xa | Địa chỉ từ xa đã đổi (máy tính khởi động lại) → trên máy tính chạy lại `node cai-dat.mjs`, cập nhật **API Host** mới trong Chatbox |
| Mất điện thoại | Dashboard → API Keys → xoá key `dien-thoai`, rồi chạy lại `node cai-dat.mjs` để cấp key mới |

## E. Xử lý lỗi nhanh

| Lỗi | Nguyên nhân | Cách xử lý |
|---|---|---|
| Không kết nối được (cùng Wi-Fi) | Tường lửa máy tính chặn cổng 20128 | Windows: cho phép Node.js qua Windows Defender Firewall (mạng Private) |
| Không kết nối được (cùng Wi-Fi) | App chặn `http://` | Dùng địa chỉ **Từ xa** (`https://`) thay thế |
| `401` / Unauthorized | Sai hoặc thiếu API Key | Dán lại đúng key `dien-thoai` |
| `403` / not allowed | Key không có quyền combo | Kiểm tra `cau-hinh.json`, chạy lại script |
| `502` / `503` | Tất cả nguồn đang hết lượt hoặc lỗi | Chờ vài phút; thêm key Gemini/Groq nếu chưa có |

## ⚠️ Bảo mật khi mở truy cập từ xa

- Ai có **địa chỉ + key** đều dùng được hạn mức của bạn → không chia sẻ key `dien-thoai`.
- Gọi không có key bị chặn (`REQUIRE_API_KEY=true`, script đã bật sẵn).
- Dashboard cũng truy cập được qua địa chỉ từ xa → được bảo vệ bằng mật khẩu ngẫu nhiên trong `~/.omniroute/.env`; không chia sẻ mật khẩu.
- Không cần dùng từ xa nữa: Dashboard → Tunnels → **Disable** Cloudflare.
- Quy tắc dữ liệu giữ nguyên: **không** gửi BOM, bản vẽ, giá, hợp đồng, thông tin khách hàng qua `mien-phi`.
