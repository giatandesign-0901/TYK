#!/usr/bin/env node
// Cài đặt + cấu hình OmniRoute trọn gói (Windows / macOS / Linux). Chạy lại nhiều lần được.
//
//   node cai-dat.mjs            (hỏi có mở truy cập từ xa hay không)
//   node cai-dat.mjs --tu-xa    (mở luôn Cloudflare Tunnel, không hỏi)
//   node cai-dat.mjs --doi-key  (thay key Gemini/Cerebras/Groq đã kết nối, ví dụ khi key bị lộ)
//
// Các bước: kiểm tra Node → cài omniroute → tạo ~/.omniroute/.env → khởi động máy chủ
// → (tuỳ chọn) nhập key free Gemini/Cerebras/Groq → tạo combo + key dự án theo cau-hinh.json
// → (tuỳ chọn) mở Cloudflare Tunnel để điện thoại dùng từ xa.
import { spawn, spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync, chmodSync } from "node:fs";
import { homedir, networkInterfaces } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createInterface } from "node:readline/promises";

const OMNIROUTE_VERSION = "3.8.52";
const PORT = process.env.PORT || "20128";
const URL_BASE = process.env.OMNIROUTE_URL || `http://127.0.0.1:${PORT}`;
const DATA_DIR = join(homedir(), ".omniroute");
const ENV_FILE = join(DATA_DIR, ".env");
const KEYS_FILE = join(DATA_DIR, "khoa-du-an.txt");
const REMOTE_FILE = join(DATA_DIR, "dia-chi-tu-xa.txt");
const ARGS = process.argv.slice(2);
const TU_XA = ARGS.includes("--tu-xa");
const DOI_KEY = ARGS.includes("--doi-key");
const CONFIG_FILE =
  ARGS.find((a) => !a.startsWith("--")) || join(dirname(fileURLToPath(import.meta.url)), "cau-hinh.json");
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
// Windows cần shell để chạy omniroute.cmd/npm.cmd; ghép sẵn 1 chuỗi lệnh (tham số đều là hằng số) để tránh cảnh báo DEP0190
const winCmd = (cmd, args) => [cmd, ...args].join(" ");
const run = (cmd, args, opts = {}) =>
  IS_WIN
    ? spawnSync(winCmd(cmd, args), { encoding: "utf8", shell: true, ...opts })
    : spawnSync(cmd, args, { encoding: "utf8", ...opts });

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
  const serveArgs = ["serve", "--daemon", "--no-open", "--no-tray"];
  const opts = { detached: true, stdio: "ignore" };
  (IS_WIN ? spawn(winCmd("omniroute", serveArgs), { ...opts, shell: true }) : spawn("omniroute", serveArgs, opts)).unref();
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
const connected = new Map(conns.map((c) => [c.provider, c.id]));
const TTY = process.stdin.isTTY;
// Hỏi thường (một dòng)
async function ask(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    return await rl.question(question);
  } finally {
    rl.close();
  }
}
// Nhập key: mỗi ký tự hiện thành * để key không lộ trên màn hình (khi chụp/chép kết quả)
function askSecret(question) {
  return new Promise((resolve) => {
    const stdin = process.stdin;
    process.stdout.write(question);
    stdin.setRawMode(true);
    stdin.setEncoding("utf8");
    stdin.resume();
    let value = "";
    const finish = () => {
      stdin.off("data", onData);
      stdin.setRawMode(false);
      stdin.pause();
      process.stdout.write("\n");
      resolve(value);
    };
    const onData = (chunk) => {
      for (const ch of chunk) {
        if (ch === "\r" || ch === "\n") return finish();
        if (ch === "\u0003") {
          stdin.setRawMode(false);
          process.exit(130); // Ctrl+C
        }
        if (ch === "\u007f" || ch === "\b") {
          if (value) {
            value = value.slice(0, -1);
            process.stdout.write("\b \b");
          }
        } else if (ch >= " ") {
          value += ch;
          process.stdout.write("*");
        }
      }
    };
    stdin.on("data", onData);
  });
}
// Lấy key từ bộ nhớ tạm (khi không dán được vào cửa sổ dòng lệnh), rồi xoá bộ nhớ tạm
function readClipboard() {
  const r = IS_WIN
    ? spawnSync("powershell", ["-NoProfile", "-Command", "Get-Clipboard | Out-String"], { encoding: "utf8" })
    : process.platform === "darwin"
      ? spawnSync("pbpaste", [], { encoding: "utf8" })
      : null;
  return r && r.status === 0 ? r.stdout.trim() : null;
}
function clearClipboard() {
  if (IS_WIN) spawnSync("powershell", ["-NoProfile", "-Command", "Set-Clipboard -Value ' '"]);
  else if (process.platform === "darwin") spawnSync("pbcopy", [], { input: "" });
}
for (const p of FREE_PROVIDERS) {
  if (connected.has(p.id) && !(DOI_KEY && TTY)) {
    console.log(`  = ${p.ten}: đã kết nối${DOI_KEY ? "" : "  (thay key: node cai-dat.mjs --doi-key)"}`);
    continue;
  }
  if (!TTY) {
    console.log(`  - ${p.ten}: bỏ qua (không có bàn phím nhập)`);
    continue;
  }
  const connId = connected.get(p.id);
  const hoi = connId ? "dán key MỚI (hoặc gõ c = lấy từ bộ nhớ tạm), Enter để giữ key cũ" : "dán key (hoặc gõ c = lấy từ bộ nhớ tạm), Enter để bỏ qua";
  let key = (await askSecret(`  ${p.ten} — ${hoi}\n    lấy key tại ${p.lay_key}\n    > `)).trim();
  if (key.toLowerCase() === "c") {
    key = readClipboard();
    if (!key || /\s/.test(key) || key.length > 300) {
      console.log(`  ✗ ${p.ten}: bộ nhớ tạm không chứa key (hãy bấm Copy key trên trang của hãng NGAY TRƯỚC khi gõ c) — bỏ qua`);
      continue;
    }
    clearClipboard();
    console.log(`    (đã lấy key từ bộ nhớ tạm: ${key.length} ký tự, bắt đầu ${key.slice(0, 3)}…; đã xoá bộ nhớ tạm)`);
  }
  if (!key) {
    console.log(connId ? `  = ${p.ten}: giữ key cũ` : `  - ${p.ten}: bỏ qua (có thể chạy lại script để thêm sau)`);
    continue;
  }
  const r = connId
    ? await api("PATCH", `/api/providers/${connId}`, { apiKey: key, isActive: true })
    : await api("POST", "/api/providers", { provider: p.id, apiKey: key, name: `${p.id}-free` });
  const xong = connId ? "đã thay key" : "đã kết nối";
  console.log(r.ok ? `  + ${p.ten}: ${xong}` : `  ✗ ${p.ten}: ${JSON.stringify(r.data).slice(0, 200)}`);
}

// ── 6. Combo + key dự án theo cau-hinh.json ──────────────────────────
const config = JSON.parse(readFileSync(CONFIG_FILE, "utf8"));

buoc("Tạo combo");
const existingCombos = new Map(((await api("GET", "/api/combos")).data.combos || []).map((c) => [c.name, c]));
const modelList = (models) => (models || []).map((m) => (typeof m === "string" ? m : m.model)).join("|");
// Các thiết lập combo cần khớp cau-hinh.json (chỉ so các khoá có trong tệp cấu hình)
const configDiffers = (cur = {}, want = {}) => Object.keys(want).some((k) => cur?.[k] !== want[k]);
for (const combo of config.combos) {
  const existing = existingCombos.get(combo.name);
  if (existing) {
    // Đồng bộ danh sách model theo cau-hinh.json (ví dụ khi hãng ngừng một model)
    if (modelList(existing.models) === modelList(combo.models) && !configDiffers(existing.config, combo.config)) {
      console.log(`  = ${combo.name} (đã có)`);
    } else {
      const r = await api("PATCH", `/api/combos/${existing.id}`, { models: combo.models, config: combo.config });
      console.log(r.ok ? `  ~ ${combo.name}: đã cập nhật model + thiết lập` : `  ✗ ${combo.name}: ${JSON.stringify(r.data).slice(0, 200)}`);
    }
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

// ── 7. Truy cập từ điện thoại ────────────────────────────────────────
buoc("Truy cập từ điện thoại");
// Cùng Wi-Fi: địa chỉ mạng nội bộ của máy này
const lanUrls = Object.values(networkInterfaces())
  .flat()
  .filter((i) => i && i.family === "IPv4" && !i.internal)
  .map((i) => i.address)
  // Ưu tiên địa chỉ Wi-Fi/LAN thật (192.168.x, 10.x); 172.x thường là card ảo (WSL, Hyper-V, VirtualBox)
  .sort((a, b) => /^172\./.test(a) - /^172\./.test(b))
  .map((a) => `http://${a}:${PORT}/v1`);

// Ở xa: Cloudflare Quick Tunnel (miễn phí, không cần tài khoản; địa chỉ đổi mỗi lần tunnel khởi động lại)
const tunnelStatus = (d) => (d && typeof d.status === "object" && d.status ? d.status : d) || {};
let remoteUrl = tunnelStatus((await api("GET", "/api/tunnels/cloudflared")).data).apiUrl || null;
if (remoteUrl) {
  console.log("  = Cloudflare Tunnel đang chạy");
} else {
  let want = TU_XA;
  if (!want && TTY) {
    const a = await ask("  Mở truy cập từ xa (dùng điện thoại khi không cùng Wi-Fi)? [c/K]: ");
    want = /^c(o|ó)?$/i.test(a.trim());
  }
  if (want) {
    console.log("  đang mở Cloudflare Tunnel (lần đầu sẽ tự tải cloudflared)...");
    const r = await api("POST", "/api/tunnels/cloudflared", { action: "enable" });
    if (!r.ok) {
      console.log(`  ✗ Không mở được tunnel: ${JSON.stringify(r.data).slice(0, 300)}`);
    } else {
      remoteUrl = tunnelStatus(r.data).apiUrl || null;
      for (let i = 0; i < 30 && !remoteUrl; i++) {
        await sleep(3000);
        remoteUrl = tunnelStatus((await api("GET", "/api/tunnels/cloudflared")).data).apiUrl || null;
      }
      console.log(remoteUrl ? "  + đã mở" : "  ✗ Tunnel chưa có địa chỉ — xem Dashboard → Tunnels.");
    }
  } else {
    console.log("  - bỏ qua truy cập từ xa (chạy  node cai-dat.mjs --tu-xa  để mở sau)");
  }
}
if (remoteUrl) writeFileSync(REMOTE_FILE, remoteUrl + "\n");

// ── Tổng kết ─────────────────────────────────────────────────────────
const hostOf = (u) => u.replace(/\/v1$/, "");
console.log(`
✓ Hoàn tất.

  Dashboard     : ${URL_BASE.replace("127.0.0.1", "localhost")}   (mật khẩu: INITIAL_PASSWORD trong ${ENV_FILE})
  Key dự án     : ${KEYS_FILE}
  Base URL (API): ${URL_BASE.replace("127.0.0.1", "localhost")}/v1    model = mien-phi

  Điện thoại (Chatbox AI → OpenAI API Compatible), API Key = key "dien-thoai", Model = mien-phi:
    Cùng Wi-Fi  : ${lanUrls.length ? `API Host ${hostOf(lanUrls[0])}` : "(không tìm thấy địa chỉ mạng nội bộ)"}${lanUrls.length > 1 ? `   (dự phòng: ${lanUrls.slice(1).map(hostOf).join(", ")})` : ""}
    Từ xa       : ${remoteUrl ? `API Host ${hostOf(remoteUrl)}   (lưu tại ${REMOTE_FILE})` : "(chưa mở — chạy  node cai-dat.mjs --tu-xa)"}
    ${remoteUrl ? "⚠ Địa chỉ từ xa ĐỔI mỗi khi máy tính/tunnel khởi động lại → chạy lại script rồi cập nhật trong Chatbox." : ""}

  Khi Claude hết lượt (hỏi từ dòng lệnh):
    macOS/Linux : OMNIROUTE_API_KEY=<key-dự-án> omniroute chat --model mien-phi "câu hỏi"
    Windows     : $env:OMNIROUTE_API_KEY="<key-dự-án>"; omniroute.cmd chat --model mien-phi "câu hỏi"

  Thêm key Gemini/Cerebras/Groq: chạy lại  node cai-dat.mjs
  Thêm dự án: thêm 1 dòng vào cau-hinh.json rồi chạy lại  node cai-dat.mjs
`);
