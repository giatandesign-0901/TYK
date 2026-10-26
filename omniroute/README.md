# OmniRoute – Cấu hình xưởng gỗ

Cổng AI dùng chung cho các công cụ AI của xưởng: một endpoint, mỗi bộ phận có key riêng, có giới hạn chi phí.

## Cấu hình

### Combo định tuyến

| Combo | Dùng cho | Thứ tự model (priority) |
|---|---|---|
| `xuong-nhanh` | Định dạng bảng, dịch thuật ngữ, tóm tắt ngắn | `claude-haiku-5-5` → `claude-sonnet-5-5` |
| `xuong-chinh-xac` | Đối chiếu BOM/bản vẽ, phân tích sự cố, lập kế hoạch PM | `claude-opus-5-5` → `claude-sonnet-5-5` |

`priority`: luôn dùng model đầu, lỗi thì chuyển model sau.

### API key theo bộ phận

| Key | Combo được phép | Hạn mức ngày | Hạn mức tháng | Cảnh báo |
|---|---|---|---|---|
| `bao-tri` | cả 2 | 5 USD | 50 USD | 80% |
| `ke-hoach` | cả 2 | 5 USD | 50 USD | 80% |
| `qc` | `xuong-nhanh` | 2 USD | 20 USD | 80% |

> ⚠️ Hạn mức là **giá trị mẫu** — sửa mảng `KEYS` trong `cau-hinh-xuong.sh` theo ngân sách thực tế.

## Triển khai

| Bước | Lệnh |
|---|---|
| 1. Cài | `npm install -g omniroute` |
| 2. Tạo `.env` | Chép `.env.example` → `.env`, đổi `INITIAL_PASSWORD` |
| 3. Chạy máy chủ | `omniroute serve --no-open` |
| 4. Kết nối Anthropic | Dashboard `http://<máy-chủ>:20128` → Providers → Anthropic → nhập API key |
| 5. Tạo combo + key | `OMNIROUTE_PASSWORD=<mật-khẩu> ./cau-hinh-xuong.sh` |
| 6. Lưu key | Script in key **một lần duy nhất** → lưu vào kho mật khẩu, giao từng bộ phận |

Script chạy lại an toàn: combo/key đã có sẽ bỏ qua.

## Gọi từ công cụ AI

```bash
curl http://<máy-chủ>:20128/v1/chat/completions \
  -H "Authorization: Bearer <key-bộ-phận>" \
  -H "Content-Type: application/json" \
  -d '{"model":"xuong-chinh-xac","messages":[{"role":"user","content":"..."}]}'
```

Công cụ hỗ trợ chuẩn OpenAI: đặt base URL `http://<máy-chủ>:20128/v1`, model = tên combo.

## Checklist bảo mật

- [ ] `REQUIRE_API_KEY=true` — nếu `false`, yêu cầu **không có key** sẽ bỏ qua toàn bộ phân quyền và hạn mức.
- [ ] Đổi `INITIAL_PASSWORD` mặc định.
- [ ] Không commit `.env` hay key vào git.
- [ ] Chỉ mở cổng 20128 trong mạng nội bộ xưởng.

## Đã kiểm thử (OmniRoute v3.8.52, máy chủ cục bộ)

| Kiểm tra | Kết quả |
|---|---|
| Tạo 2 combo, 3 key, gán combo + hạn mức | ✅ |
| Chạy lại script (không tạo trùng) | ✅ |
| Key chỉ có `xuong-nhanh` gọi `xuong-chinh-xac` | ✅ Bị chặn HTTP 403 |
| Gọi model thật | ⏳ Chưa — cần kết nối API key Anthropic (bước 4) |
