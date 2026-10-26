# OmniRoute – Cổng AI dùng chung cho mọi dự án

Một máy chủ OmniRoute duy nhất phục vụ **tất cả dự án**. Mỗi dự án có 1 API key riêng, có định mức chi phí riêng, và gọi AI qua cùng 1 địa chỉ.

```
Dự án A ─┐ key "du-an-a"
Dự án B ─┼──► OmniRoute ──► Claude (Opus / Sonnet / Haiku)
Dự án C ─┘ key "du-an-c"     │
                             └─ ghi chi phí theo từng key
```

## Cấu hình (`cau-hinh.json`)

### Combo theo loại việc (dùng chung cho mọi dự án)

| Combo | Dùng khi | Thứ tự model |
|---|---|---|
| `nhanh` | Định dạng, dịch, tóm tắt ngắn, nhiều lượt | `claude-haiku-5-5` → `claude-sonnet-5-5` |
| `chinh-xac` | Phân tích, đối chiếu số liệu, lập kế hoạch, viết code | `claude-opus-5-5` → `claude-sonnet-5-5` |

Combo dùng chế độ `priority`: luôn dùng model đầu, lỗi thì tự chuyển sang model sau.

### Key theo dự án

| Key | Dùng cho | Ngày / Tháng (USD) |
|---|---|---|
| `chung` | Việc lặt vặt, thử nghiệm, chưa thuộc dự án nào | 5 / 50 |
| `tyk` | Dự án TYK | 5 / 50 |

> ⚠️ Hạn mức là **giá trị mẫu** — sửa theo ngân sách thực tế. `0` = không giới hạn.

## Thêm một dự án mới

1. Thêm 1 dòng vào mảng `keys` trong `cau-hinh.json`:
   ```json
   { "name": "ten-du-an", "combos": ["nhanh", "chinh-xac"], "daily": 5, "monthly": 50 }
   ```
2. Chạy lại: `OMNIROUTE_PASSWORD=<mật-khẩu> ./cau-hinh.sh`
3. Script chỉ tạo key mới (key cũ giữ nguyên) và in key **một lần** → lưu lại.

## Cài đặt lần đầu (1 lần duy nhất)

| Bước | Việc làm |
|---|---|
| 1 | `npm install -g omniroute` |
| 2 | Chép `.env.example` → `.env`, đổi `INITIAL_PASSWORD` |
| 3 | `omniroute serve --no-open` (hoặc `omniroute autostart enable` để tự chạy khi khởi động máy) |
| 4 | Dashboard `http://localhost:20128` → Providers → Anthropic → nhập API key Anthropic |
| 5 | `OMNIROUTE_PASSWORD=<mật-khẩu> ./cau-hinh.sh` |

## Dùng hằng ngày trong một dự án

| Công cụ | Cách trỏ về OmniRoute |
|---|---|
| Claude Code | `omniroute launch --api-key <key-dự-án>` (mở Claude Code đi qua OmniRoute) |
| Công cụ chuẩn OpenAI (script, Cursor, Codex, n8n…) | Base URL `http://localhost:20128/v1`, API key = key dự án, model = `nhanh` hoặc `chinh-xac` |
| Gọi trực tiếp | Xem ví dụ dưới |

```bash
curl http://localhost:20128/v1/chat/completions \
  -H "Authorization: Bearer <key-dự-án>" \
  -H "Content-Type: application/json" \
  -d '{"model":"chinh-xac","messages":[{"role":"user","content":"..."}]}'
```

Mẹo: đặt key vào tệp `.env` của từng dự án (`OMNIROUTE_API_KEY=...`), không ghi thẳng vào code.

## Theo dõi chi phí

- Dashboard → **Usage**: chi phí theo từng key, tức là theo từng dự án.
- CLI: `omniroute cost` hoặc `omniroute usage`.

## Checklist bảo mật

- [ ] `REQUIRE_API_KEY=true` — nếu `false`, yêu cầu **không có key** sẽ bỏ qua toàn bộ phân quyền và hạn mức.
- [ ] Đổi `INITIAL_PASSWORD` mặc định.
- [ ] Không commit `.env` hay key vào git.
- [ ] Chỉ mở cổng 20128 trong mạng nội bộ.

## Đã kiểm thử (OmniRoute v3.8.52, máy chủ cục bộ)

| Kiểm tra | Kết quả |
|---|---|
| Tạo combo + key + gán quyền + hạn mức | ✅ |
| Chạy lại script (không tạo trùng) | ✅ |
| Thêm 1 dự án mới vào `cau-hinh.json` rồi chạy lại → chỉ tạo key mới | ✅ |
| Key không được phép gọi combo → bị chặn | ✅ HTTP 403 |
| Gọi model thật | ⏳ Cần nhập API key Anthropic (bước 4) |
