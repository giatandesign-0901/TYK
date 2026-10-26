#!/usr/bin/env node
// Cài đặt + cấu hình OmniRoute trọn gói (Windows / macOS / Linux). Chạy lại nhiều lần được.
//
//   node cai-dat.mjs
//
// Các bước: kiểm tra Node → cài omniroute → tạo ~/.omniroute/.env → khởi động máy chủ
// → (tuỳ chọn) nhập key free Gemini/Cerebras/Groq → tạo combo + key dự án theo cau-hinh.json.
import { spawn, spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync, chmodSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createInterface } from "node:readline/promises";

const OMNIROUTE_VERSION = "3.8.52";
const PORT = process.env.PORT || "20128";
const URL_BASE = process.env.OMNIROUTE_URL || `http://127.0.0.1:${PORT}`;
const DATA_DIR = join(homedir(), ".omniroute");
const ENV_FILE = join(DATA_DIR, ".env");
const KEYS_FILE = join(DATA_DIR, "khoa-du-an.txt");
const CONFIG_FILE = process.argv[2] || join(dirname(fileURLToPath(import.meta.url)), "cau-hinh.json");
const IS_WIN = process.platform === "win32";

const FREE_PROVIDERS = [
  { id: "gemini", ten: "Google Gemini", lay_key: "https://aistudio.google.com/apikey" },
  { id: "cerebras", ten: "Cerebras", lay_key: "https://cloud.cerebras.ai" },
  { id: "groq", ten: "Groq", lay_key: "https://console.groq.com/keys" },
];

const buoc = (msg) => console.log(`\n→ ${msg}`);
const loi = (msg) => {
  console.error(`\n✗ ${msg}`);
  process.exit(1);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const run = (cmd, args, opts = {}) => spawnSync(cmd, args, { encoding: "utf8", shell: IS_WIN, ...opts });

// ── 1. Node.js ────────────────────────────────────────────────────────
buoc(`Kiểm tra Node.js (${process.version})`);
const [major, minor, patch] = process.versions.node.split(".").map(Number);
const nodeOk = major >= 24 || (major === 22 && (minor > 22 || (minor === 22 && patch >= 2)));
if (!nodeOk) {
  loi(
    `OmniRoute cần Node.js 24 LTS (tối thiểu 22.22.2). Máy đang có ${process.version}.\n` +
      `  Tải tại https://nodejs.org (chọn bản LTS), cài xong mở lại cửa sổ dòng lệnh rồi chạy lại.`
  );
}

// ── 2. Cài omniroute ──────────────────────────────────────────────────
buoc(`Cài omniroute@${OMNIROUTE_VERSION}`);
const ver = run("omniroute", ["--version"]);
const installed = (ver.stdout || "").trim().split("\n").pop();
if (installed === OMNIROUTE_VERSION) {
  console.log("  = đã cài đúng phiên bản");
} else {
  console.log(`  (hiện tại: ${installed || "chưa cài"}) — đang cài, mất vài phút...`);
  const r = run("npm", ["install", "-g", `omniroute@${OMNIROUTE_VERSION}`, "--no-audit", "--no-fund"], {
    stdio: "inherit",
  });
  if (r.status !== 0) {
    loi(
      "Cài omniroute thất bại." +
        (IS_WIN ? "" : "\n  Nếu lỗi quyền (EACCES): chạy lại với sudo, hoặc cài Node qua nvm.")
    );
  }
}

// ── 3. Tệp cấu hình ~/.omniroute/.env ─────────────────────────────────
buoc(`Tệp cấu hình ${ENV_FILE}`);
mkdirSync(DATA_DIR, { recursive: true });
if (!existsSync(ENV_FILE)) {
  const password = randomBytes(12).toString("base64url");
  writeFileSync(
    ENV_FILE,
    `# Tạo bởi cai-dat.mjs\nINITIAL_PASSWORD=${password}\nREQUIRE_API_KEY=true\nPORT=${PORT}\n`
  );
  console.log("  + đã tạo (mật khẩu quản trị ngẫu nhiên)");
} else {
  console.log("  = đã có");
}
let envText = readFileSync(ENV_FILE, "utf8");
if (!/^REQUIRE_API_KEY=/m.test(envText)) {
  appendFileSync(ENV_FILE, "\nREQUIRE_API_KEY=true\n");
  envText = readFileSync(ENV_FILE, "utf8");
}
if (/^REQUIRE_API_KEY=false/m.test(envText)) {
  console.log("  ⚠ REQUIRE_API_KEY=false — yêu cầu không có key sẽ bỏ qua phân quyền. Nên đổi thành true.");
}
try {
  chmodSync(ENV_FILE, 0o600);
} catch {}
const PASSWORD =
  process.env.OMNIROUTE_PASSWORD || (envText.match(/^INITIAL_PASSWORD=(.*)$/m) || [])[1]?.trim();

// ── 4. Khởi động máy chủ ──────────────────────────────────────────────
const serverUp = async () => {
  try {
    await fetch(`${URL_BASE}/api/health`, { signal: AbortSignal.timeout(3000) });
    return true;
  } catch {
    return false;
  }
};
buoc(`Máy chủ OmniRoute (${URL_BASE})`);
if (await serverUp()) {
  console.log("  = đang chạy");
} else {
  console.log("  khởi động nền...");
  spawn("omniroute", ["serve", "--daemon", "--no-open", "--no-tray"], {
    detached: true,
    stdio: "ignore",
    shell: IS_WIN,
  }).unref();
  let up = false;
  for (let i = 0; i < 60 && !up; i++) {
    await sleep(3000);
    up = await serverUp();
  }
  if (!up) loi("Máy chủ không khởi động được. Thử chạy tay: omniroute serve  để xem lỗi.");
  console.log("  + đã chạy");
}

// ── Gọi API quản trị ─────────────────────────────────────────────────
let cookie = "";
async function api(method, path, body) {
  const res = await fetch(`${URL_BASE}${path}`, {
    method,
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: body === undefined ? undefined : JSON.stringify(body),
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

buoc("Đăng nhập quản trị");
if (!PASSWORD) loi(`Không tìm thấy mật khẩu. Đặt INITIAL_PASSWORD trong ${ENV_FILE} hoặc biến OMNIROUTE_PASSWORD.`);
const login = await api("POST", "/api/auth/login", { password: PASSWORD });
if (!login.ok || login.data.success !== true) {
  loi(
    "Đăng nhập thất bại — mật khẩu không khớp.\n" +
      "  Nếu đã đổi mật khẩu trên Dashboard: chạy lại với biến OMNIROUTE_PASSWORD=<mật-khẩu>."
  );
}
cookie = (login.headers.getSetCookie?.() || [login.headers.get("set-cookie") || ""])
  .map((c) => c.split(";")[0])
  .join("; ");
console.log("  ✓");

// ── 5. Key free của các hãng (tuỳ chọn) ───────────────────────────────
buoc("Kết nối nguồn AI free (Gemini, Cerebras, Groq)");
const conns = (await api("GET", "/api/providers")).data.connections || [];
const connected = new Set(conns.map((c) => c.provider));
const rl = process.stdin.isTTY ? createInterface({ input: process.stdin, output: process.stdout }) : null;
for (const p of FREE_PROVIDERS) {
  if (connected.has(p.id)) {
    console.log(`  = ${p.ten}: đã kết nối`);
    continue;
  }
  if (!rl) {
    console.log(`  - ${p.ten}: bỏ qua (không có bàn phím nhập)`);
    continue;
  }
  const key = (await rl.question(`  ${p.ten} — dán key (lấy tại ${p.lay_key}), Enter để bỏ qua: `)).trim();
  if (!key) {
    console.log(`  - ${p.ten}: bỏ qua (có thể chạy lại script để thêm sau)`);
    continue;
  }
  const r = await api("POST", "/api/providers", { provider: p.id, apiKey: key, name: `${p.id}-free` });
  console.log(r.ok ? `  + ${p.ten}: đã kết nối` : `  ✗ ${p.ten}: ${JSON.stringify(r.data).slice(0, 200)}`);
}
rl?.close();

// ── 6. Combo + key dự án theo cau-hinh.json ──────────────────────────
const config = JSON.parse(readFileSync(CONFIG_FILE, "utf8"));

buoc("Tạo combo");
const existingCombos = new Set(((await api("GET", "/api/combos")).data.combos || []).map((c) => c.name));
for (const combo of config.combos) {
  if (existingCombos.has(combo.name)) {
    console.log(`  = ${combo.name} (đã có)`);
    continue;
  }
  const r = await api("POST", "/api/combos", combo);
  if (!r.ok) loi(`Tạo combo ${combo.name} thất bại: ${JSON.stringify(r.data).slice(0, 300)}`);
  console.log(`  + ${combo.name}`);
}

buoc("Tạo key dự án");
const existingKeys = (await api("GET", "/api/keys")).data.keys || [];
const newKeys = [];
for (const k of config.keys) {
  let id = existingKeys.find((e) => e.name === k.name)?.id;
  if (id) {
    console.log(`  = ${k.name} (đã có — xem ${KEYS_FILE})`);
  } else {
    const r = await api("POST", "/api/keys", { name: k.name });
    if (!r.ok || !r.data.id) loi(`Tạo key ${k.name} thất bại: ${JSON.stringify(r.data).slice(0, 300)}`);
    id = r.data.id;
    newKeys.push(`${k.name}=${r.data.key}`);
    console.log(`  + ${k.name}`);
  }
  // Luôn đồng bộ quyền theo cau-hinh.json: key chỉ được gọi các combo được chỉ định
  await api("PATCH", `/api/keys/${id}`, { allowedCombos: k.combos });
}
if (newKeys.length) {
  appendFileSync(KEYS_FILE, newKeys.join("\n") + "\n");
  try {
    chmodSync(KEYS_FILE, 0o600);
  } catch {}
}

// ── Tổng kết ─────────────────────────────────────────────────────────
console.log(`
✓ Hoàn tất.

  Dashboard     : ${URL_BASE.replace("127.0.0.1", "localhost")}   (mật khẩu: INITIAL_PASSWORD trong ${ENV_FILE})
  Key dự án     : ${KEYS_FILE}
  Base URL (API): ${URL_BASE.replace("127.0.0.1", "localhost")}/v1    model = mien-phi

  Khi Claude hết lượt (hỏi từ dòng lệnh):
    macOS/Linux : OMNIROUTE_API_KEY=<key-dự-án> omniroute chat --model mien-phi "câu hỏi"
    Windows     : $env:OMNIROUTE_API_KEY="<key-dự-án>"; omniroute chat --model mien-phi "câu hỏi"

  Thêm key Gemini/Cerebras/Groq: chạy lại  node cai-dat.mjs
  Thêm dự án: thêm 1 dòng vào cau-hinh.json rồi chạy lại  node cai-dat.mjs
`);
