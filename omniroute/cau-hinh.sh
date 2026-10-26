#!/usr/bin/env bash
# Áp cấu hình OmniRoute dùng chung cho mọi dự án: combo AI miễn phí + 1 API key mỗi dự án.
# Nội dung lấy từ cau-hinh.json. Chạy lại nhiều lần được: combo/key đã có thì bỏ qua.
#
# Dùng:  OMNIROUTE_PASSWORD=... ./cau-hinh.sh [đường-dẫn-cau-hinh.json]
# Yêu cầu: curl, jq, máy chủ OmniRoute đang chạy (omniroute serve).
set -euo pipefail

OMNIROUTE_URL="${OMNIROUTE_URL:-http://localhost:20128}"
: "${OMNIROUTE_PASSWORD:?Cần đặt OMNIROUTE_PASSWORD (mật khẩu quản trị dashboard)}"
CONFIG="${1:-$(dirname "$0")/cau-hinh.json}"
jq -e '.combos and .keys' "$CONFIG" >/dev/null || { echo "✗ $CONFIG không hợp lệ"; exit 1; }

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
jq -c '.combos[]' "$CONFIG" | while read -r combo; do
  name="$(jq -r .name <<<"$combo")"
  if grep -qx "$name" <<<"$existing_combos"; then
    echo "  = $name (đã có)"
  else
    api POST /api/combos "$combo" | jq -e '.id // .combo.id' >/dev/null \
      && echo "  + $name" || { echo "  ✗ $name"; exit 1; }
  fi
done

echo "→ Tạo API key"
existing_keys="$(api GET /api/keys | jq -c '.keys[] | {name, id}')"
jq -c '.keys[]' "$CONFIG" | while read -r k; do
  name="$(jq -r .name <<<"$k")"
  id="$(jq -r --arg n "$name" 'select(.name == $n) | .id' <<<"$existing_keys" | head -1)"
  if [[ -n "$id" ]]; then
    msg="  = $name (đã có — không in lại key)"
  else
    created="$(api POST /api/keys "$(jq '{name}' <<<"$k")")"
    id="$(jq -r '.id' <<<"$created")"
    [[ "$id" != null ]] || { echo "  ✗ $name: $created"; exit 1; }
    msg="  + $name  key=$(jq -r '.key' <<<"$created")"
  fi

  # Luôn đồng bộ quyền theo cau-hinh.json (kể cả key cũ): chỉ được gọi các combo được chỉ định
  api PATCH "/api/keys/$id" "$(jq '{allowedCombos: .combos}' <<<"$k")" >/dev/null
  echo "$msg"
done

echo "✓ Xong. Lưu các key vừa in vào nơi an toàn — sẽ không hiển thị lại."
