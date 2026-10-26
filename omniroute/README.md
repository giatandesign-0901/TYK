# OmniRoute – AI miễn phí dự phòng khi Claude hết lượt

Dùng chung cho **mọi dự án**. Không phát sinh chi phí, **không cần đăng ký tài khoản hay key** nào.

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

Lý do: các nguồn ẩn danh không có cam kết bảo mật — dữ liệu gửi lên có thể bị lưu hoặc dùng lại.

## Combo `mien-phi`

Chế độ `priority`: dùng nguồn đầu, lỗi/quá tải thì tự chuyển nguồn sau. Cả 5 nguồn đều **không cần key**.

| # | Nguồn | Model |
|---|---|---|
| 1 | Pollinations | `openai` |
| 2 | Pollinations | `deepseek` |
| 3 | UncloseAI | `qwen3.6:27b` |
| 4 | UncloseAI | `gemma4:31b` |
| 5 | Pollinations | `mistral` |

Lưu ý: nguồn ẩn danh **chậm và kém ổn định hơn** Claude, thường giới hạn số yêu cầu/phút, có thể ngừng bất cứ lúc nào. Chỉ dùng tạm khi Claude hết lượt.

## Cài đặt lần đầu (1 lần duy nhất)

| Bước | Việc làm |
|---|---|
| 1 | `npm install -g omniroute@3.8.52` (bản đã kiểm thử) |
| 2 | Chép `.env.example` → `.env`, đổi `INITIAL_PASSWORD` |
| 3 | `omniroute serve --no-open` (hoặc `omniroute autostart enable` để tự chạy khi bật máy) |
| 4 | `OMNIROUTE_PASSWORD=<mật-khẩu> ./cau-hinh.sh` → lưu key dự án được in ra (chỉ in 1 lần) |

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
| Tạo combo `mien-phi` (5 nguồn, đúng nhà cung cấp) | ✅ |
| Tạo key, chạy lại không tạo trùng, đồng bộ quyền key cũ | ✅ |
| Key gọi combo không được phép → bị chặn | ✅ HTTP 403 |
| Combo dùng nguồn không key: OmniRoute tự gọi Pollinations, không cần kết nối/khai báo key | ✅ |
| Nhận câu trả lời thật | ⏳ Máy thử bị chặn mạng ra ngoài — cần chạy trên máy của bạn |
