---
name: omniroute-xuong
description: Vận hành OmniRoute của người dùng — cổng AI miễn phí dự phòng khi Claude hết lượt (combo "mien-phi": Gemini → Groq → Pollinations), dùng trên máy tính Windows và điện thoại Android qua Chatbox AI. Dùng khi người dùng nhắc tới OmniRoute, mien-phi, Chatbox báo lỗi, "kiểm tra AI miễn phí", đổi/lộ key Gemini/Groq/Cerebras, địa chỉ từ xa/tunnel/API Host, tự khởi động cùng Windows, thêm dự án hoặc model vào combo, hoặc một model bị hãng ngừng.
---

# OmniRoute – AI miễn phí dự phòng (xưởng Dukhaco)

Trả lời người dùng **bằng tiếng Việt**, ngắn gọn, ưu tiên bảng + checklist, mỗi lệnh trong một khối riêng.

## Kiến trúc

```
📱 Chatbox AI (model mien-phi) ─► Cloudflare Tunnel ─► 💻 Windows: OmniRoute :20128
💻 omniroute.cmd chat / công cụ OpenAI-compatible ─────────────┘   combo "mien-phi" (priority):
                                                                    Gemini → Cerebras → Groq ×2 → Pollinations
```

- Claude dùng **trực tiếp** (app/claude.ai). OmniRoute chỉ dùng khi Claude hết lượt.
- Máy chủ chạy trên **máy tính của người dùng**, không phải trong phiên Claude.

## Tệp & vị trí

| Tệp | Vai trò |
|---|---|
| `omniroute/cai-dat.mjs` (trong kho TYK) | Cài + cấu hình, chạy lại an toàn |
| `omniroute/kiem-tra.mjs` | Chẩn đoán: key từng nguồn + gửi thử từng model, in lỗi gốc của hãng |
| `omniroute/cau-hinh.json` | Combo `mien-phi` (models + config) và key theo dự án |
| `omniroute/README.md`, `omniroute/ANDROID.md` | Hướng dẫn máy tính / Chatbox |
| `~/.omniroute/.env` | `INITIAL_PASSWORD` (Dashboard), `REQUIRE_API_KEY=true` |
| `~/.omniroute/khoa-du-an.txt` | Key dự án (`chung`, `tyk`, `dien-thoai`) |
| `~/.omniroute/dia-chi-tu-xa.txt` | Địa chỉ tunnel hiện tại (`https://…trycloudflare.com/v1`) |
| `~/.omniroute/tu-khoi-dong.log` | Nhật ký tác vụ tự khởi động |

Máy người dùng (đã biết): Windows, thư mục `C:\TYK\TYK-ccr-4b25b539-v2sdf6\omniroute`, Node.js 24, OmniRoute 3.8.52. Nếu không thấy thư mục: tìm `cai-dat.mjs` (PowerShell: `Get-PSDrive -PSProvider FileSystem | % { Get-ChildItem $_.Root -Recurse -Filter cai-dat.mjs -ErrorAction SilentlyContinue } | Select -First 1`), hoặc lấy từ GitHub `giatandesign-0901/TYK`, nhánh `ccr-4b25b539-v2sdf6`.

## Trước khi làm: đang chạy ở đâu?

- **Phiên Local trên máy người dùng** (cwd dạng `C:\…` hoặc `/Users/…`): tự chạy lệnh được.
- **Phiên cloud** (cwd `/home/user/…`): KHÔNG chạy `cai-dat.mjs`/tunnel ở đây (máy tạm, bị chặn mạng). Chỉ sửa tệp trong kho, commit/push, rồi đưa lệnh cho người dùng chạy trên máy họ (tải tệp bằng URL raw **theo mã commit** để tránh cache: `https://raw.githubusercontent.com/giatandesign-0901/TYK/<commit>/omniroute/<tệp>`).

## Việc thường gặp

| Người dùng muốn | Lệnh (chạy trong thư mục `omniroute`) |
|---|---|
| Kiểm tra hệ thống | `node kiem-tra.mjs` |
| Bật lại máy chủ + tunnel, lấy địa chỉ mới | `node cai-dat.mjs --tu-xa` |
| Đổi key bị lộ/hết hạn | `node cai-dat.mjs --doi-key` → ở câu hỏi: copy key trên trang hãng rồi gõ `c` + Enter (lấy từ bộ nhớ tạm) |
| Thêm key nguồn mới (vd Cerebras) | `node cai-dat.mjs` → dán key / gõ `c` |
| Tự khởi động cùng Windows | `node cai-dat.mjs --tu-khoi-dong` → thử: `schtasks /Run /TN OmniRoute` → xem: `Get-Content "$HOME\.omniroute\tu-khoi-dong.log" -Encoding UTF8 -Tail 12` |
| Gỡ tự khởi động | `node cai-dat.mjs --bo-tu-khoi-dong` |
| Xem địa chỉ từ xa hiện tại | `Get-Content "$HOME\.omniroute\dia-chi-tu-xa.txt"` (bỏ `/v1` khi điền API Host) |
| Thêm dự án | thêm `{ "name": "ten-du-an", "combos": ["mien-phi"] }` vào `keys` trong `cau-hinh.json` → `node cai-dat.mjs` |
| Đổi model / thiết lập combo | sửa `models`/`config` trong `cau-hinh.json` → `node cai-dat.mjs` (tự cập nhật combo đã có) |
| Hỏi nhanh từ dòng lệnh Windows | xem khối lệnh bên dưới |

Hỏi nhanh từ dòng lệnh Windows (key đọc từ tệp, không hiện ra màn hình):

```powershell
$env:OMNIROUTE_API_KEY = ((Get-Content "$HOME\.omniroute\khoa-du-an.txt" | Select-String '^chung=') -split '=',2)[1]
omniroute.cmd chat --model mien-phi "cau hoi"
```

Chatbox (Android): Model Provider → OpenAI API Compatible · API Host = địa chỉ từ xa (không `/v1`) hoặc `http://<IP-Wi-Fi>:20128` · API Path `/v1/chat/completions` · API Key = key `dien-thoai` · Model `mien-phi` (không bật Vision/Tool use). Chọn đúng model `mien-phi` ở khung nhập — "Chatbox Guide" là AI của app, không qua OmniRoute.

## Xử lý lỗi (đã gặp thực tế)

| Triệu chứng | Nguyên nhân | Cách xử lý |
|---|---|---|
| `kiem-tra`: `404 … no longer available` / model not found | Hãng ngừng model | Lấy tên model mới (lời báo lỗi thường gợi ý; danh sách model: Dashboard → Nhà cung cấp → model) → sửa `cau-hinh.json` → `node cai-dat.mjs` |
| `503 high demand` (Gemini) | Hãng quá tải tạm thời | Bình thường — combo tự chuyển Groq. Không cần sửa |
| `401` từ hãng / "key LỖI" | Key sai, đã xoá, hết hạn | `node cai-dat.mjs --doi-key` |
| `401` khi gọi `/v1` | Thiếu/sai key dự án | Dùng đúng key trong `khoa-du-an.txt` |
| `403 Combo … not allowed` | Key không có quyền combo | Kiểm tra `keys[].combos` trong `cau-hinh.json` → `node cai-dat.mjs` |
| Chatbox: "Software caused connection abort" | Tunnel chết/đổi địa chỉ, hoặc combo chờ quá ~100 s (giới hạn Cloudflare) | Mở địa chỉ từ xa bằng trình duyệt điện thoại: không vào được → `node cai-dat.mjs --tu-xa` + sửa API Host. Vào được → kiểm tra `config` combo còn `targetTimeoutMs: 25000`, `maxRetries: 0`, `timeoutMs: 90000` |
| Chatbox lỗi kết nối | Máy tính ngủ/tắt | Power & sleep → Never; chờ tác vụ tự khởi động |
| `omniroute.ps1 cannot be loaded … running scripts is disabled` | Execution Policy của PowerShell | Dùng `omniroute.cmd`, không đổi chính sách |
| `The '<' operator is reserved` | Người dùng gõ nguyên chỗ giữ chỗ `<…>` | Đưa lệnh có đường dẫn thật, đặt trong ngoặc kép (tên người dùng có dấu cách) |
| Ký tự lạ `☻` đầu dòng, lệnh hỏng | Lỡ bấm Ctrl+V/Ctrl+B trong PowerShell cũ | Esc, dán bằng **chuột phải** |
| Tác vụ tự khởi động "treo" | Script hỏi key khi chạy nền | Tác vụ phải gọi `--tu-xa --nen` (tạo lại bằng `--tu-khoi-dong`) |
| Tiếng Việt lỗi (`TÃ´i`, `─æ├ú`) | Bảng mã Windows PowerShell 5.1 | Chỉ là hiển thị; đọc log bằng `-Encoding UTF8` |

## Quy tắc bắt buộc

1. **Không bao giờ yêu cầu hay nhận key qua chat.** Key chỉ nhập vào cửa sổ dòng lệnh khi script hỏi (hiện `*****`) hoặc gõ `c` lấy từ bộ nhớ tạm. Nếu người dùng lỡ dán key/ảnh có key: báo ngay là đã lộ, hướng dẫn xoá key đó trên trang hãng và tạo key mới. Không lặp lại key trong câu trả lời.
2. **Không nối gói Claude Pro/Max** (OAuth "Claude Code") vào OmniRoute — trái điều khoản Anthropic, có thể bị khoá tài khoản.
3. **Dữ liệu mật** (BOM, bản vẽ, định mức, giá, hợp đồng, khách hàng, nhân sự) **không gửi qua `mien-phi`** — gói free có thể dùng dữ liệu để cải thiện dịch vụ; Pollinations ẩn danh.
4. PowerShell trên máy người dùng: mỗi lệnh một khối, dán bằng chuột phải; **không** dùng `Read-Host` trong khối nhiều dòng (dòng kế tiếp bị nuốt làm câu trả lời); lệnh tải tệp dùng URL theo mã commit.
5. Chỉ báo "đã chạy được" khi có bằng chứng (`kiem-tra.mjs` ✓ hoặc câu trả lời thật trong Chatbox); nói rõ phần nào chưa kiểm chứng.
