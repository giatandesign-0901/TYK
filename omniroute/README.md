# OmniRoute – AI miễn phí dự phòng khi Claude hết lượt

Dùng chung cho **mọi dự án**. Không phát sinh chi phí: ưu tiên hạn mức free của hãng uy tín (Google, Cerebras, Groq), nguồn ẩn danh Pollinations chỉ là lưới an toàn cuối.

## Cài đặt — 2 bước

| Bước | Việc làm |
|---|---|
| 1 | Cài **Node.js 24 LTS** từ [nodejs.org](https://nodejs.org) (bản thấp hơn 22.22.2 OmniRoute sẽ từ chối chạy) |
| 2 | Tải thư mục này về, mở cửa sổ dòng lệnh tại thư mục `omniroute/`, chạy: **`node cai-dat.mjs`** |

Script tự làm hết: cài OmniRoute 3.8.52 → tạo mật khẩu quản trị ngẫu nhiên → bật bắt buộc key → khởi động máy chủ nền → hỏi key free (Enter để bỏ qua) → tạo combo `mien-phi` → tạo key cho từng dự án → hỏi có mở truy cập từ xa cho điện thoại (Cloudflare Tunnel).

Kết quả lưu tại:

| Tệp | Nội dung |
|---|---|
| `~/.omniroute/.env` | Mật khẩu quản trị Dashboard (`INITIAL_PASSWORD`) |
| `~/.omniroute/khoa-du-an.txt` | Key của từng dự án (có key `dien-thoai` dành cho điện thoại) |
| `~/.omniroute/dia-chi-tu-xa.txt` | Địa chỉ truy cập từ xa (nếu đã mở tunnel) |

📱 **Dùng trên điện thoại Android:** xem [ANDROID.md](ANDROID.md) — cài Chatbox AI và kết nối từng bước.

(`~` = thư mục người dùng, ví dụ `C:\Users\<tên>` trên Windows, `/Users/<tên>` trên macOS)

**Chạy lại `node cai-dat.mjs` bất cứ lúc nào** — an toàn, không tạo trùng. Dùng khi: thêm key free, thêm dự án, hoặc máy chủ chưa chạy sau khi khởi động lại máy.

## Key free (tuỳ chọn, nên có)

Không có key vẫn chạy được (bằng Pollinations). Có key thì nhanh, ổn định và đáng tin cậy hơn. Đăng ký không cần thẻ, rồi chạy lại `node cai-dat.mjs` và dán key khi được hỏi:

| Hãng | Lấy key tại |
|---|---|
| Google Gemini | [aistudio.google.com/apikey](https://aistudio.google.com/apikey) |
| Cerebras | [cloud.cerebras.ai](https://cloud.cerebras.ai) |
| Groq | [console.groq.com/keys](https://console.groq.com/keys) |

## Nguyên tắc vận hành

| Tình huống | Dùng gì |
|---|---|
| Bình thường | Claude **trực tiếp** (claude.ai, app, Claude Code) — không qua OmniRoute |
| Claude báo hết lượt | OmniRoute, model `mien-phi` |
| Claude có lượt trở lại | Quay về Claude |

> ⚠️ **Không** nối tài khoản gói Claude Pro/Max vào OmniRoute — trái điều khoản Anthropic, có thể bị khóa tài khoản.

### Hỏi khi Claude hết lượt

| Cách | Lệnh / thiết lập |
|---|---|
| Dòng lệnh macOS/Linux | `OMNIROUTE_API_KEY=<key-dự-án> omniroute chat --model mien-phi "câu hỏi"` |
| Dòng lệnh Windows (PowerShell) | `$env:OMNIROUTE_API_KEY="<key-dự-án>"; omniroute chat --model mien-phi "câu hỏi"` |
| Công cụ chuẩn OpenAI (Cursor, Cline, Codex, script…) | Base URL `http://localhost:20128/v1`, API key = key dự án, model `mien-phi` |

## Dữ liệu được / không được gửi qua `mien-phi`

| ✅ Được gửi | ❌ Không gửi |
|---|---|
| Dịch, định dạng bảng, sửa câu chữ | BOM, bản vẽ, định mức của công ty |
| Hỏi kiến thức chung, giải thích khái niệm | Giá, báo giá, hợp đồng, thông tin khách hàng |
| Khung SOP / checklist mẫu không chứa số liệu thật | Dữ liệu nhân sự, tài chính |
| Code không chứa mật khẩu / key | Mật khẩu, API key, tệp `.env` |

Lý do: gói free của các hãng có thể dùng dữ liệu để cải thiện dịch vụ (ví dụ gói free Gemini API); nguồn ẩn danh thì không có cam kết bảo mật nào.

## Combo `mien-phi` (`cau-hinh.json`)

Chế độ `priority`: dùng nguồn đầu, hết lượt/lỗi thì tự chuyển nguồn sau. Nguồn chưa có key được tự bỏ qua.

| # | Nguồn | Model | Loại | Hạn mức free (theo OmniRoute) |
|---|---|---|---|---|
| 1 | Google AI Studio | `gemini-2.5-flash` | Uy tín, key free | 1.500 yêu cầu/ngày |
| 2 | Cerebras | `gpt-oss-120b` | Uy tín, key free | 1 triệu token/ngày |
| 3 | Groq | `llama-3.3-70b-versatile` | Uy tín, key free | 14.400 yêu cầu/ngày |
| 4 | Groq | `openai/gpt-oss-120b` | Uy tín, key free | chung hạn mức Groq |
| 5 | Pollinations | `openai` | Ẩn danh, không key | không công bố |
| 6 | Pollinations | `deepseek` | Ẩn danh, không key | không công bố |

Hạn mức do các hãng quy định và có thể thay đổi.

## Thêm dự án mới

1. Thêm 1 dòng vào `keys` trong `cau-hinh.json`: `{ "name": "ten-du-an", "combos": ["mien-phi"] }`
2. Chạy lại `node cai-dat.mjs` → key mới được ghi thêm vào `~/.omniroute/khoa-du-an.txt`.

Đổi danh sách model của combo đã tạo: sửa trong Dashboard → Combos (script không ghi đè combo đã có).

## Bảo mật (script đã tự làm)

- [x] `REQUIRE_API_KEY=true` — gọi `/v1` không có key bị từ chối (HTTP 401).
- [x] Mật khẩu quản trị ngẫu nhiên, không dùng mặc định.
- [x] Tệp `.env` và `khoa-du-an.txt` chỉ chủ máy đọc được (macOS/Linux).
- [ ] Không chép key vào git hay gửi qua chat.

## Đã kiểm thử (OmniRoute 3.8.52, Node.js 24, máy chủ cục bộ)

| Kiểm tra | Kết quả |
|---|---|
| `node cai-dat.mjs` lần đầu: tạo `.env`, khởi động máy chủ, tạo combo + 2 key | ✅ |
| Chạy lại: không tạo trùng, đồng bộ quyền key | ✅ |
| Gọi `/v1` không có key | ✅ Bị chặn HTTP 401 |
| Key gọi combo không được phép | ✅ Bị chặn HTTP 403 |
| Nguồn chưa có key / key lỗi → tự chuyển sang Pollinations | ✅ |
| `omniroute chat` với `OMNIROUTE_API_KEY` | ✅ Qua xác thực |
| Gọi qua địa chỉ mạng nội bộ (như điện thoại cùng Wi-Fi) | ✅ Có key: qua; không key: HTTP 401 |
| Mở Cloudflare Tunnel (`--tu-xa`) | ⏳ Chưa chạy thử — môi trường thử không cho mở tunnel ra Internet |
| Nhận câu trả lời thật | ⏳ Máy thử bị chặn mạng ra ngoài — cần chạy trên máy của bạn |
| Chạy trên Windows / macOS | ⏳ Chưa thử trực tiếp (script dùng Node.js thuần, không cần bash) |
