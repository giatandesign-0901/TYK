#!/usr/bin/env node
// Kiểm tra nhanh OmniRoute: trạng thái từng nguồn AI và gửi thử từng model trong combo.
// Không in key nào ra màn hình.
//
//   node kiem-tra.mjs
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const URL_BASE = process.env.OMNIROUTE_URL || `http://127.0.0.1:${process.env.PORT || "20128"}`;
const ENV_FILE = join(homedir(), ".omniroute", ".env");
const CONFIG_FILE = join(dirname(fileURLToPath(import.meta.url)), "cau-hinh.json");

let cookie = "";
async function api(method, path, body) {
  const res = await fetch(`${URL_BASE}${path}`, {
    method,
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(90000),
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }
  return { ok: res.ok, status: res.status, data, headers: res.headers };
}
const short = (v, n = 220) => {
  const s = typeof v === "string" ? v : JSON.stringify(v);
  return s.length > n ? s.slice(0, n) + "…" : s;
};

const password =
  process.env.OMNIROUTE_PASSWORD ||
  (readFileSync(ENV_FILE, "utf8").match(/^INITIAL_PASSWORD=(.*)$/m) || [])[1]?.trim();
let login;
try {
  login = await api("POST", "/api/auth/login", { password });
} catch {
  console.log(`✗ Máy chủ OmniRoute không chạy (${URL_BASE}) — chạy: node cai-dat.mjs`);
  process.exit(1);
}
if (!login.ok) {
  console.log("✗ Đăng nhập quản trị thất bại — kiểm tra INITIAL_PASSWORD trong " + ENV_FILE);
  process.exit(1);
}
cookie = (login.headers.getSetCookie?.() || [login.headers.get("set-cookie") || ""])
  .map((c) => c.split(";")[0])
  .join("; ");

const conns = (await api("GET", "/api/providers")).data.connections || [];
const config = JSON.parse(readFileSync(CONFIG_FILE, "utf8"));

console.log("\n== Nguồn AI đã kết nối");
for (const c of conns) {
  const t = await api("POST", `/api/providers/${c.id}/test`, {});
  const key = t.data?.valid ? "key hợp lệ" : `key LỖI: ${short(t.data?.error || t.data)}`;
  console.log(`  ${c.provider.padEnd(10)} bật: ${c.isActive ? "có " : "KHÔNG"} | ${key}`);
}

for (const combo of config.combos) {
  console.log(`\n== Gửi thử từng model trong combo "${combo.name}" (theo thứ tự ưu tiên)`);
  for (const m of combo.models) {
    const conn = conns.find((c) => c.provider === m.provider);
    const label = m.model.padEnd(34);
    if (!conn) {
      const note = m.provider === "pollinations" ? "không cần key, không kiểm tra riêng" : `chưa kết nối ${m.provider}`;
      console.log(`  ${label} - bỏ qua (${note})`);
      continue;
    }
    const modelId = m.model.startsWith(`${m.provider}/`) ? m.model.slice(m.provider.length + 1) : m.model;
    try {
      // PUT chọn model thử cho tài khoản, POST gửi một tin nhắn thử thật tới hãng
      const set = await api("PUT", `/api/providers/${conn.id}/test-message`, { modelId });
      const r = set.ok ? await api("POST", `/api/providers/${conn.id}/test-message`, {}) : set;
      const ok = r.ok && !r.data?.error && r.data?.success !== false && r.data?.ok !== false;
      console.log(`  ${label} ${ok ? "✓ CHẠY TỐT" : `✗ LỖI ${r.status}: ${short(r.data?.error?.message || r.data?.error || r.data)}`}`);
    } catch (e) {
      console.log(`  ${label} ✗ LỖI: ${e.message}`);
    }
  }
}
console.log("");
