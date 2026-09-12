import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || "127.0.0.1";
const PASSWORD = process.env.ADMIN_PASSWORD || "magang2026";
const DATA_DIR = path.join(__dirname, ".local-data");
const DATA_FILE = path.join(DATA_DIR, "content.json");
const HISTORY_FILE = path.join(DATA_DIR, "history.json");
const SESSION_COOKIE = "mj_admin_session";
const SESSION_MAX_AGE = 8 * 60 * 60;

const DEFAULT_CONTENT = {
  logo: "assets/logo.png",
  positions: [
    { icon: "assets/icon-administrasi.png", label: "Administrasi" },
    { icon: "assets/icon-UI-UX.png", label: "UI/UX Designer" },
    { icon: "assets/icon-programmer.png", label: "Programmer Frontend/Backend" },
    { icon: "assets/icon-hr.png", label: "Human Resource" },
    { icon: "assets/icon-social-media.png", label: "Social Media Specialist" },
    { icon: "assets/icon-photographer.png", label: "Photographer/Videographer" },
    { icon: "assets/icon-content-writer.png", label: "Content Writer" },
    { icon: "assets/icon-megaphone.png", label: "Marketing & Sales" },
    { icon: 'assets/icon-desain-grafis.png', label: 'Desain Grafis' },
    { icon: "assets/icon-digital-marketing.png", label: "Digital Market" },
    { icon: "assets/icon-speaker.png", label: "Marcomm/Public Relation" },
    { icon: "assets/icon-chat.png", label: "Host / Presenter" },
    { icon: "assets/icon-tiktok.png", label: "TikTok Creator" },
    { icon: "assets/icon-voice-over.png", label: "Voice Over Talent" },
    { icon: "assets/icon-phone.png", label: "Content Planner" },
    { icon: "assets/icon-project-manager.png", label: "Project Manager" },
    { icon: "assets/icon-las.png", label: "LAS" },
    { icon: "assets/icon-animasi.png", label: "Animasi" }
  ],
  facilities: [
    "Bimbingan dari staff / asisten kami",
    "Ada pelatihan diluar jam kerja",
    "Mendapatkan sertifikat + seragam magangjogja.com",
    "Koneksi Internet Free (bagi yang WFO)",
    "Bagi yang jauh dari luar kota diberikan info kost murah",
    "Free drink (Coffee & Tea)",
    "Mendapat surat rekomendasi",
    "Mendapatkan kesempatan untuk bergabung dan bekerjasama di project-project team kami",
    "Networking & Experience"
  ]
};

const clone = value => JSON.parse(JSON.stringify(value));

function createSessionToken() {
  const expires = Math.floor(Date.now() / 1000) + SESSION_MAX_AGE;
  const payload = String(expires);
  const signature = crypto.createHmac("sha256", PASSWORD).update(payload).digest("hex");
  return `${payload}.${signature}`;
}

function sessionValid(req) {
  const cookieHeader = req.headers.cookie || "";
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([^;]+)`));
  if (!match) return false;
  const [expires, signature] = String(match[1]).split(".");
  if (!expires || !signature || !/^\d+$/.test(expires)) return false;
  if (Number(expires) < Math.floor(Date.now() / 1000)) return false;
  const expected = crypto.createHmac("sha256", PASSWORD).update(expires).digest("hex");
  const a = Buffer.from(signature, "utf8");
  const b = Buffer.from(expected, "utf8");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function ensureData() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(clone(DEFAULT_CONTENT), null, 2), "utf8");
  }
  if (!fs.existsSync(HISTORY_FILE)) {
    fs.writeFileSync(HISTORY_FILE, JSON.stringify({ history: [] }, null, 2), "utf8");
  }
}

function readHistory() {
  ensureData();
  try {
    const parsed = JSON.parse(fs.readFileSync(HISTORY_FILE, "utf8"));
    return Array.isArray(parsed.history) ? parsed.history : [];
  } catch {
    return [];
  }
}

function writeHistory(history) {
  ensureData();
  const temp = `${HISTORY_FILE}.tmp`;
  fs.writeFileSync(temp, JSON.stringify({ history }, null, 2), "utf8");
  fs.renameSync(temp, HISTORY_FILE);
}

function same(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function diffValues(before, after, path = "", changes = []) {
  if (same(before, after)) return changes;
  const beforeObj = before && typeof before === "object";
  const afterObj = after && typeof after === "object";
  if (beforeObj && afterObj && !Array.isArray(before) && !Array.isArray(after)) {
    const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
    for (const key of keys) diffValues(before[key], after[key], path ? `${path}.${key}` : key, changes);
    return changes;
  }
  if (Array.isArray(before) && Array.isArray(after)) {
    const length = Math.max(before.length, after.length);
    for (let i = 0; i < length; i++) {
      const nextPath = `${path}[${i}]`;
      if (i >= before.length) changes.push({ field: nextPath, before: null, after: clone(after[i]) });
      else if (i >= after.length) changes.push({ field: nextPath, before: clone(before[i]), after: null });
      else diffValues(before[i], after[i], nextPath, changes);
    }
    return changes;
  }
  changes.push({ field: path || "content", before: clone(before), after: clone(after) });
  return changes;
}

function changedSections(changes) {
  const sections = new Set();
  for (const change of changes) {
    const root = String(change.field).split(/[.[\]]/)[0];
    if (["logo", "positions", "facilities"].includes(root)) sections.add(root);
  }
  return sections;
}

function historyDescription(sections) {
  const names = [];
  if (sections.has("logo")) names.push("Logo");
  if (sections.has("positions")) names.push("Formasi Magang");
  if (sections.has("facilities")) names.push("Fasilitas");
  if (names.length === 1) return `${names[0]} diubah`;
  if (names.length > 1) return `${names.slice(0, -1).join(", ")}, dan ${names[names.length - 1]} diubah`;
  return "Content diubah";
}

function nowJakartaIso() {
  const d = new Date();
  const parts = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).formatToParts(d);
  const map = Object.fromEntries(parts.map(p => [p.type, p.value]));
  return `${map.year}-${map.month}-${map.day}T${map.hour}:${map.minute}:${map.second}+07:00`;
}

function appendHistory(record) {
  const history = readHistory();
  history.unshift(record);
  writeHistory(history);
}


function readData() {
  ensureData();
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch {
    return clone(DEFAULT_CONTENT);
  }
}

function writeData(data) {
  ensureData();
  const temp = `${DATA_FILE}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(data, null, 2), "utf8");
  fs.renameSync(temp, DATA_FILE);
}

function passwordMatches(value) {
  if (typeof value !== "string") return false;
  const a = Buffer.from(value, "utf8");
  const b = Buffer.from(PASSWORD, "utf8");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function json(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  res.end(JSON.stringify(data));
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", chunk => {
      raw += chunk;
      if (raw.length > 2_000_000) {
        reject(new Error("Request too large"));
        req.destroy();
      }
    });
    req.on("end", () => {
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error("Invalid JSON"));
      }
    });
    req.on("error", reject);
  });
}

function resolveFile(urlPath) {
  const pathname = decodeURIComponent(urlPath.split("?")[0]);
  if (pathname === "/") return path.join(__dirname, "magangjogja.html");
  if (pathname === "/admin") return path.join(__dirname, "admin.html");

  const relative = pathname.replace(/^\/+/, "");
  const candidate = path.resolve(__dirname, relative);
  if (candidate !== __dirname && !candidate.startsWith(__dirname + path.sep)) return null;
  return candidate;
}

function contentType(file) {
  const map = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".svg": "image/svg+xml",
    ".webp": "image/webp",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
    ".ttf": "font/ttf",
    ".otf": "font/otf",
    ".ico": "image/x-icon",
    ".txt": "text/plain; charset=utf-8"
  };
  return map[path.extname(file).toLowerCase()] || "application/octet-stream";
}

function serveFile(res, file) {
  fs.stat(file, (err, stat) => {
    if (err || !stat.isFile()) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      return res.end("Not Found");
    }

    if (path.basename(file) === "magangjogja.html") {
      fs.readFile(file, "utf8", (readErr, html) => {
        if (readErr) {
          res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
          return res.end("Server error");
        }

        // Runtime-only injection: the original file on disk is never written.
        if (!html.includes('src="/content.js"') && !html.includes("src='\/content.js'") && !html.includes('src="content.js"')) {
          html = html.replace(/<\/body\s*>/i, '<script src="/content.js"></script>\n</body>');
        }

        res.writeHead(200, {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-store"
        });
        res.end(html);
      });
      return;
    }

    res.writeHead(200, {
      "Content-Type": contentType(file),
      "Cache-Control": "no-cache"
    });
    fs.createReadStream(file).pipe(res);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);

  try {
    if (url.pathname === "/api/auth") {
      if (req.method !== "POST") {
        res.setHeader("Allow", "POST");
        return res.end("Method Not Allowed", "utf8");
      }
      const body = await parseBody(req);
      const ok = passwordMatches(body.password);
      if (!ok) return json(res, 401, { ok: false });
      const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
      res.setHeader("Set-Cookie", `${SESSION_COOKIE}=${createSessionToken()}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_MAX_AGE}${secure}`);
      return json(res, 200, { ok: true });
    }

    if (url.pathname === "/api/content") {
      if (req.method === "GET") {
        return json(res, 200, { content: readData() });
      }

      if (!["POST", "DELETE"].includes(req.method)) {
        res.setHeader("Allow", "GET, POST, DELETE");
        return res.end("Method Not Allowed", "utf8");
      }

      const body = await parseBody(req);
      if (!passwordMatches(body.password)) {
        return json(res, 401, { ok: false, error: "Kata sandi salah." });
      }

      if (req.method === "POST") {
        if (!body.content || typeof body.content !== "object" || Array.isArray(body.content)) {
          return json(res, 400, { ok: false, error: "Data content tidak valid." });
        }
        const before = readData();
        const after = body.content;
        const changes = diffValues(before, after);
        if (changes.length === 0) return json(res, 200, { ok: true, changed: false });
        writeData(after);
        const sections = changedSections(changes);
        appendHistory({
          id: crypto.randomUUID(),
          timestamp: nowJakartaIso(),
          action: "update",
          section: sections.size > 1 ? "multiple" : ([...sections][0] || "multiple"),
          description: historyDescription(sections),
          changes,
          snapshot: clone(after)
        });
        return json(res, 200, { ok: true, changed: true });
      }

      const before = readData();
      const after = clone(DEFAULT_CONTENT);
      const changes = diffValues(before, after);
      if (changes.length === 0) return json(res, 200, { ok: true, changed: false });
      writeData(after);
      appendHistory({
        id: crypto.randomUUID(),
        timestamp: nowJakartaIso(),
        action: "reset",
        section: "multiple",
        description: "Content dikembalikan ke konfigurasi default",
        changes,
        snapshot: after
      });
      return json(res, 200, { ok: true, changed: true });
    }

    if (url.pathname === "/api/history") {
      if (req.method !== "GET") {
        res.setHeader("Allow", "GET");
        return res.end("Method Not Allowed", "utf8");
      }
      if (!sessionValid(req)) return json(res, 401, { ok: false, error: "Sesi admin tidak valid." });
      const all = readHistory();
      const limit = Math.min(Math.max(Number(url.searchParams.get("limit")) || 20, 1), 100);
      const offset = Math.max(Number(url.searchParams.get("offset")) || 0, 0);
      const history = all.slice(offset, offset + limit);
      return json(res, 200, { ok: true, history, hasMore: offset + history.length < all.length });
    }

    const file = resolveFile(url.pathname);
    if (!file) {
      res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
      return res.end("Forbidden");
    }
    serveFile(res, file);
  } catch (error) {
    console.error(error);
    return json(res, 500, { ok: false, error: "Local server error." });
  }
});

ensureData();
server.listen(PORT, HOST, () => {
  console.log(`Website: http://${HOST}:${PORT}/`);
  console.log(`Admin  : http://${HOST}:${PORT}/admin`);
  console.log(`Password lokal: ${process.env.ADMIN_PASSWORD ? "(ADMIN_PASSWORD)" : "magang2026"}`);
});