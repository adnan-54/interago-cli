import chokidar from "chokidar";
import fs from "fs";
import path from "path";
import http from "http";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PAGES_DIR = path.join(__dirname, "pages");
const IBLOCKS_DIR = path.join(__dirname, "iblocks");
const OUTPUT_DIR = path.join(__dirname, "compiled");
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css",
  ".js": "application/javascript",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

const RELOAD_SCRIPT = `<script>
  (function () {
    const es = new EventSource("/__reload");
    es.onmessage = () => location.reload();
    es.onerror = () => { es.close(); setTimeout(() => location.reload(), 2000); };
  })();
</script>`;

// --- Helpers ---

function findHtmlFiles(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...findHtmlFiles(full));
    else if (entry.name.endsWith(".html")) results.push(full);
  }
  return results;
}

// --- Compiler ---

// Cache the iblocks dir listing so repeated lookups don't re-read disk on every compile.
let iblockCache = null;
function getIblockFile(name) {
  if (!iblockCache) refreshIblockCache();
  // Prefer exact match, then fall back to "{name} - {id}.html" convention.
  return (
    iblockCache.get(name) ??
    iblockCache.get(name.toLowerCase()) ??
    null
  );
}
function refreshIblockCache() {
  iblockCache = new Map();
  if (!fs.existsSync(IBLOCKS_DIR)) return;
  for (const f of fs.readdirSync(IBLOCKS_DIR)) {
    if (!f.endsWith(".html")) continue;
    // Strip " - {id}" suffix if present, use remainder as key.
    const key = f.replace(/\s*-\s*\d+\.html$/, "").replace(/\.html$/, "");
    iblockCache.set(key, path.join(IBLOCKS_DIR, f));
    iblockCache.set(key.toLowerCase(), path.join(IBLOCKS_DIR, f));
  }
}

function compilePage(pageFile) {
  const rel = path.relative(PAGES_DIR, pageFile); // e.g. "index.html" or "teste/index.html"
  const outFile = path.join(OUTPUT_DIR, rel);

  let content = fs.readFileSync(pageFile, "utf8");

  content = content.replace(/<iBlock[^>]*name="([^"]+)"[^>]*\/>/g, (_, name) => {
    const blockFile = getIblockFile(name);
    if (blockFile) return fs.readFileSync(blockFile, "utf8");
    console.warn(`  ⚠ iBlock not found: ${name}`);
    return `<!-- [iBlock: ${name}] not found -->`;
  });

  content = content.replace(/<iExtension[^>]*name="([^"]+)"[^>]*\/>/g, (_, name) => {
    return `<!-- [iExtension: ${name}] not available locally -->`;
  });

  if (content.includes("</body>")) {
    content = content.replace("</body>", `${RELOAD_SCRIPT}\n</body>`);
  } else {
    content += "\n" + RELOAD_SCRIPT;
  }

  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, content, "utf8");
  console.log(`✓ compiled: ${rel}`);
}

function compileAll() {
  for (const file of findHtmlFiles(PAGES_DIR)) compilePage(file);
}

// --- SSE ---

const clients = new Set();

function notifyClients() {
  for (const res of clients) res.write("data: reload\n\n");
}

// --- Server ---

// URL path → file in compiled/
// /teste      → compiled/teste.html  OR  compiled/teste/index.html
// /teste/foo  → compiled/teste/foo.html  OR  compiled/teste/foo/index.html
// /           → compiled/index.html
function resolveFile(urlPath) {
  const base = path.join(OUTPUT_DIR, urlPath);
  for (const candidate of [base + ".html", path.join(base, "index.html"), base]) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
  }
  return null;
}

const server = http.createServer((req, res) => {
  if (req.url === "/__reload") {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });
    res.write(": connected\n\n");
    clients.add(res);
    req.on("close", () => clients.delete(res));
    return;
  }

  const urlPath = decodeURIComponent(req.url.split("?")[0]);
  const filePath = resolveFile(urlPath);

  if (!filePath) {
    const notFound = path.join(OUTPUT_DIR, "nao-encontrado.html");
    res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
    res.end(
      fs.existsSync(notFound)
        ? fs.readFileSync(notFound)
        : `<!doctype html><html><head><meta charset="UTF-8" /></head><body><h1>404 – Page not found</h1></body></html>`
    );
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  res.writeHead(200, { "Content-Type": MIME[ext] || "text/plain" });
  res.end(fs.readFileSync(filePath));
});

// --- Watcher ---

function onIblockChange(filePath) {
  console.log(`↻ iblock: ${path.basename(filePath)} → recompiling all`);
  iblockCache = null; // invalidate so renamed/new files are picked up
  compileAll();
  notifyClients();
}

function onPageChange(filePath) {
  const rel = path.relative(PAGES_DIR, filePath);
  console.log(`↻ page: ${rel}`);
  compilePage(filePath);
  notifyClients();
}

const watcher = chokidar.watch([PAGES_DIR, IBLOCKS_DIR], {
  ignoreInitial: true,
  persistent: true,
});

watcher.on("change", (filePath) => {
  path.relative(__dirname, filePath).startsWith("iblocks" + path.sep)
    ? onIblockChange(filePath)
    : onPageChange(filePath);
});

watcher.on("add", (filePath) => {
  const rel = path.relative(__dirname, filePath);
  if (rel.startsWith("pages" + path.sep)) {
    console.log(`+ page: ${path.relative(PAGES_DIR, filePath)}`);
    compilePage(filePath);
    notifyClients();
  } else if (rel.startsWith("iblocks" + path.sep)) {
    onIblockChange(filePath);
  }
});

// --- Start ---

compileAll();

server.listen(PORT, () => {
  console.log(`\n  Dev server → http://localhost:${PORT}\n`);
  console.log("  Watching iblocks/ and pages/ (recursive)\n");
});
