# OmniRoute – AI miễn phí dự phòng khi Claude hết lượt

Dùng chung cho **mọi dự án**. Không phát sinh chi phí: chỉ dùng hạn mức free chính thức của Google, Cerebras, Groq.

## Nguyên tắc vận hành

| Tình huống | Dùng gì |
|---|---|
| Bình thường | Claude **trực tiếp** (claude.ai, app, Claude Code) — không qua OmniRoute |
| Claude báo hết lượt | Chuyển sang OmniRoute, model = `mien-phi` |
| Claude có lượt trở lại | Quay về Claude |

> ⚠️ **Không** nối tài khoản gói Claude Pro/Max vào OmniRoute — trái điều khoản Anthropic, có thể bị khóa tài khoản.

## Dữ liệu được / không được gửi qua `mien-phi`

| ✅ Được gửi | ❌ Không gửi |
|---|---|
| Dịch, định dạng bảng, sửa câu chữ | BOM, bản vẽ, định mức của công ty |
| Hỏi kiến thức chung, giải thích khái niệm | Giá, báo giá, hợp đồng, thông tin khách hàng |
| Khung SOP / checklist mẫu không chứa số liệu thật | Dữ liệu nhân sự, tài chính |
| Code không chứa mật khẩu / key | Mật khẩu, API key, tệp `.env` |

Lý do: hạn mức free của các hãng có thể dùng dữ liệu gửi lên để cải thiện dịch vụ (ví dụ gói free Gemini API).

## Combo `mien-phi`

Chế độ `priority`: dùng nguồn đầu, hết lượt/lỗi thì tự chuyển nguồn sau.

| # | Nguồn | Model | Hạn mức free (theo OmniRoute) |
|---|---|---|---|
| 1 | Google AI Studio | `gemini-2.5-flash` | 1.500 yêu cầu/ngày |
| 2 | Cerebras | `gpt-oss-120b` | 1 triệu token/ngày |
| 3 | Groq | `llama-3.3-70b-versatile` | 30 yêu cầu/phút, 14.400/ngày |
| 4 | Groq | `openai/gpt-oss-120b` | (chung hạn mức Groq) |

Hạn mức do các hãng quy định và có thể thay đổi.

## Cài đặt lần đầu (1 lần duy nhất)

| Bước | Việc làm |
|---|---|
| 1 | `npm install -g omniroute` |
| 2 | Chép `.env.example` → `.env`, đổi `INITIAL_PASSWORD` |
| 3 | `omniroute serve --no-open` (hoặc `omniroute autostart enable` để tự chạy khi bật máy) |
| 4 | Đăng ký **key free** (không cần thẻ): [aistudio.google.com](https://aistudio.google.com) · [cloud.cerebras.ai](https://cloud.cerebras.ai) · [console.groq.com](https://console.groq.com) |
| 5 | Dashboard `http://localhost:20128` → Providers → nhập 3 key trên (Gemini, Cerebras, Groq) |
| 6 | `OMNIROUTE_PASSWORD=<mật-khẩu> ./cau-hinh.sh` → lưu key dự án được in ra (chỉ in 1 lần) |

## Dùng khi Claude hết lượt

| Công cụ | Cách làm |
|---|---|
| Công cụ chuẩn OpenAI (Cursor, Cline, Codex, script…) | Base URL `http://localhost:20128/v1`, API key = key dự án, model = `mien-phi` |
| Hỏi nhanh từ dòng lệnh | `omniroute chat --model mien-phi "câu hỏi"` |
| Gọi trực tiếp | Xem ví dụ dưới |

```bash
curl http://localhost:20128/v1/chat/completions \
  -H "Authorization: Bearer <key-dự-án>" \
  -H "Content-Type: application/json" \
  -d '{"model":"mien-phi","messages":[{"role":"user","content":"..."}]}'
```

## Thêm dự án mới

1. Thêm 1 dòng vào `keys` trong `cau-hinh.json`: `{ "name": "ten-du-an", "combos": ["mien-phi"] }`
2. Chạy lại `./cau-hinh.sh` → chỉ tạo key mới; quyền của key cũ được đồng bộ theo tệp.

Đổi danh sách model của combo đã tạo: sửa trong Dashboard → Combos (script không ghi đè combo đã có).

## Checklist bảo mật

- [ ] `REQUIRE_API_KEY=true` — nếu `false`, yêu cầu không có key sẽ bỏ qua phân quyền.
- [ ] Đổi `INITIAL_PASSWORD` mặc định.
- [ ] Không commit `.env` hay key vào git.
- [ ] Chỉ mở cổng 20128 trong máy / mạng nội bộ.

## Đã kiểm thử (OmniRoute v3.8.52, máy chủ cục bộ)

| Kiểm tra | Kết quả |
|---|---|
| Tạo combo `mien-phi` (4 nguồn, đúng nhà cung cấp) | ✅ |
| Tạo key, chạy lại không tạo trùng, đồng bộ quyền key cũ | ✅ |
| Key gọi combo không được phép → bị chặn | ✅ HTTP 403 |
| Gọi model thật | ⏳ Cần nhập key free ở bước 5 |
