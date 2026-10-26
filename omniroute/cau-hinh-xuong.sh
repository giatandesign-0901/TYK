#!/usr/bin/env bash
# Cấu hình OmniRoute cho xưởng gỗ: 2 combo định tuyến + API key theo bộ phận + ngân sách.
# Chạy lại nhiều lần được (idempotent): combo/key đã tồn tại thì bỏ qua.
#
# Dùng:  OMNIROUTE_PASSWORD=... ./cau-hinh-xuong.sh
# Yêu cầu: curl, jq, máy chủ OmniRoute đang chạy (omniroute serve).
set -euo pipefail

OMNIROUTE_URL="${OMNIROUTE_URL:-http://localhost:20128}"
: "${OMNIROUTE_PASSWORD:?Cần đặt OMNIROUTE_PASSWORD (mật khẩu quản trị dashboard)}"

# ── Combo ──────────────────────────────────────────────────────────────
# xuong-nhanh     : việc đơn giản (định dạng bảng, dịch thuật ngữ, tóm tắt ngắn)
# xuong-chinh-xac : việc cần độ chính xác (đối chiếu BOM, phân tích nguyên nhân sự cố)
# strategy=priority: luôn dùng model đầu tiên, lỗi thì chuyển model kế tiếp.
COMBOS='[
  {
    "name": "xuong-nhanh",
    "description": "Việc đơn giản: định dạng bảng, dịch thuật ngữ, tóm tắt ngắn",
    "strategy": "priority",
    "models": [
      { "provider": "anthropic", "model": "claude-haiku-5-5" },
      { "provider": "anthropic", "model": "claude-sonnet-5-5" }
    ],
    "config": { "maxRetries": 1, "timeoutMs": 60000 }
  },
  {
    "name": "xuong-chinh-xac",
    "description": "Đối chiếu BOM/bản vẽ, phân tích sự cố, lập kế hoạch PM",
    "strategy": "priority",
    "models": [
      { "provider": "anthropic", "model": "claude-opus-5-5" },
      { "provider": "anthropic", "model": "claude-sonnet-5-5" }
    ],
    "config": { "maxRetries": 2, "timeoutMs": 180000 }
  }
]'

# ── API key theo bộ phận ───────────────────────────────────────────────
# Ngân sách (USD) là GIÁ TRỊ MẪU — điều chỉnh theo thực tế trước khi dùng.
# 0 = không giới hạn kỳ đó.
KEYS='[
  { "name": "bao-tri",  "combos": ["xuong-nhanh", "xuong-chinh-xac"], "daily": 5, "monthly": 50 },
  { "name": "ke-hoach", "combos": ["xuong-nhanh", "xuong-chinh-xac"], "daily": 5, "monthly": 50 },
  { "name": "qc",       "combos": ["xuong-nhanh"],                    "daily": 2, "monthly": 20 }
]'

JAR="$(mktemp)"
trap 'rm -f "$JAR"' EXIT

api() { # api METHOD PATH [JSON]
  curl -sS -b "$JAR" -X "$1" "$OMNIROUTE_URL$2" \
    -H "Content-Type: application/json" ${3:+-d "$3"}
}

echo "→ Đăng nhập $OMNIROUTE_URL"
curl -sS -c "$JAR" -H "Content-Type: application/json" \
  -d "$(jq -n --arg p "$OMNIROUTE_PASSWORD" '{password:$p}')" \
  "$OMNIROUTE_URL/api/auth/login" | jq -e '.success == true' >/dev/null \
  || { echo "✗ Đăng nhập thất bại"; exit 1; }

echo "→ Tạo combo"
existing_combos="$(api GET /api/combos | jq -r '.combos[].name')"
jq -c '.[]' <<<"$COMBOS" | while read -r combo; do
  name="$(jq -r .name <<<"$combo")"
  if grep -qx "$name" <<<"$existing_combos"; then
    echo "  = $name (đã có)"
  else
    api POST /api/combos "$combo" | jq -e '.id // .combo.id' >/dev/null \
      && echo "  + $name" || { echo "  ✗ $name"; exit 1; }
  fi
done

echo "→ Tạo API key"
existing_keys="$(api GET /api/keys | jq -r '.keys[].name')"
jq -c '.[]' <<<"$KEYS" | while read -r k; do
  name="$(jq -r .name <<<"$k")"
  if grep -qx "$name" <<<"$existing_keys"; then
    echo "  = $name (đã có — không in lại key)"
    continue
  fi
  created="$(api POST /api/keys "$(jq '{name}' <<<"$k")")"
  id="$(jq -r '.id' <<<"$created")"
  secret="$(jq -r '.key' <<<"$created")"
  [[ "$id" != null ]] || { echo "  ✗ $name: $created"; exit 1; }

  # Chỉ cho phép gọi các combo được chỉ định
  api PATCH "/api/keys/$id" "$(jq '{allowedCombos: .combos}' <<<"$k")" >/dev/null
  # Ngân sách ngày/tháng, cảnh báo khi dùng 80%
  api POST /api/usage/budget "$(jq --arg id "$id" \
    '{apiKeyId:$id, dailyLimitUsd:.daily, monthlyLimitUsd:.monthly, warningThreshold:0.8}' <<<"$k")" >/dev/null

  echo "  + $name  key=$secret"
done

echo "✓ Xong. Lưu các key vừa in vào nơi an toàn — sẽ không hiển thị lại."
