import chokidar, { type FSWatcher } from "chokidar";
import { existsSync, readFileSync, readdirSync, statSync } from "fs";
import { join, relative, sep, extname } from "path";

// --- Module-level state ---
let bunServer: ReturnType<typeof Bun.serve> | null = null;
let watcher: FSWatcher | null = null;
let cwd = process.cwd();

const pageFileMap = new Map<string, string>();   // url-key → file path
const iblockFileMap = new Map<string, string>(); // block name (lower) → file path
const pageCache = new Map<string, string>();     // url-key → compiled HTML
const sseClients = new Set<ReadableStreamDefaultController<Uint8Array>>();
const enc = new TextEncoder();

const MIME: Record<string, string> = {
  ".css": "text/css",
  ".js": "application/javascript",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

const RELOAD_SCRIPT = `<script>(function(){const e=new EventSource("/__reload");e.onmessage=()=>location.reload();e.onerror=()=>{e.close();setTimeout(()=>location.reload(),2000)}})();</script>`;

// --- File map builders ---

function findHtmlFiles(dir: string): string[] {
  const results: string[] = [];
  if (!existsSync(dir)) return results;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) results.push(...findHtmlFiles(full));
    else if (entry.name.endsWith(".html")) results.push(full);
  }
  return results;
}

function buildPageFileMap(): void {
  pageFileMap.clear();
  const pagesDir = join(cwd, "pages");
  for (const file of findHtmlFiles(pagesDir)) {
    const rel = relative(pagesDir, file).replace(/\\/g, "/");
    // Strip " - {id}" suffix → URL key
    const key = rel
      .replace(/\s*-\s*\d+\.html$/, "")
      .replace(/\.html$/, "")
      .toLowerCase();
    pageFileMap.set(key, file);
  }
}

function buildIblockFileMap(): void {
  iblockFileMap.clear();
  const iblocksDir = join(cwd, "iblocks");
  if (!existsSync(iblocksDir)) return;
  for (const f of readdirSync(iblocksDir)) {
    if (!f.endsWith(".html")) continue;
    const key = f
      .replace(/\s*-\s*\d+\.html$/, "")
      .replace(/\.html$/, "")
      .toLowerCase();
    iblockFileMap.set(key, join(iblocksDir, f));
  }
}

// --- On-demand compiler ---

function compileOnDemand(urlPath: string): string | null {
  const rawKey = urlPath.replace(/^\//, "").replace(/\/$/, "") || "index";
  const key = rawKey.toLowerCase();

  if (pageCache.has(key)) return pageCache.get(key)!;
  if (!pageFileMap.size) buildPageFileMap();

  const filePath = pageFileMap.get(key);
  if (!filePath || !existsSync(filePath)) return null;

  if (!iblockFileMap.size) buildIblockFileMap();

  let content = readFileSync(filePath, "utf8");

  content = content.replace(/<iBlock[^>]*name="([^"]+)"[^>]*\/>/g, (_, name) => {
    const blockFile = iblockFileMap.get(name.toLowerCase());
    if (blockFile && existsSync(blockFile)) return readFileSync(blockFile, "utf8");
    return `<!-- [iBlock: ${name}] not found -->`;
  });

  content = content.replace(
    /<iExtension[^>]*name="([^"]+)"[^>]*\/>/g,
    (_, name) => `<!-- [iExtension: ${name}] not available locally -->`
  );

  content = content.includes("</body>")
    ? content.replace("</body>", `${RELOAD_SCRIPT}\n</body>`)
    : content + "\n" + RELOAD_SCRIPT;

  pageCache.set(key, content);
  return content;
}

// --- SSE ---

function notifySSEClients(): void {
  for (const ctrl of sseClients) {
    try {
      ctrl.enqueue(enc.encode("data: reload\n\n"));
    } catch {
      sseClients.delete(ctrl);
    }
  }
}

// --- Public API ---

export function startServer(port: number, dir: string): void {
  if (bunServer) return;
  cwd = dir;
  buildPageFileMap();
  buildIblockFileMap();

  bunServer = Bun.serve({
    port,
    fetch(req) {
      const url = new URL(req.url);
      const pathname = decodeURIComponent(url.pathname);

      // SSE live-reload endpoint
      if (pathname === "/__reload") {
        let ctrl!: ReadableStreamDefaultController<Uint8Array>;
        const stream = new ReadableStream<Uint8Array>({
          start(c) {
            ctrl = c;
            sseClients.add(c);
            c.enqueue(enc.encode(": connected\n\n"));
          },
          cancel() {
            sseClients.delete(ctrl);
          },
        });
        return new Response(stream, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
          },
        });
      }

      // Page: compile on demand
      const html = compileOnDemand(pathname);
      if (html) {
        return new Response(html, {
          headers: { "Content-Type": "text/html; charset=utf-8" },
        });
      }

      // Static file fallback (CSS, images, fonts…)
      const staticPath = join(cwd, pathname);
      if (existsSync(staticPath) && statSync(staticPath).isFile()) {
        const ext = extname(staticPath).toLowerCase();
        return new Response(Bun.file(staticPath), {
          headers: { "Content-Type": MIME[ext] || "application/octet-stream" },
        });
      }

      return new Response("404 – Not found", {
        status: 404,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    },
  });

  const pagesDir = join(cwd, "pages");
  const iblocksDir = join(cwd, "iblocks");

  watcher = chokidar.watch([pagesDir, iblocksDir], {
    ignoreInitial: true,
    persistent: true,
  });

  watcher.on("change", (filePath: string) => {
    const rel = relative(cwd, filePath);
    if (rel.startsWith("iblocks" + sep)) {
      // Iblock changed: invalidate iblock map + full page cache
      iblockFileMap.clear();
      pageCache.clear();
    } else {
      // Page changed: invalidate just that page's cache entry
      for (const [key, fp] of pageFileMap.entries()) {
        if (fp === filePath) pageCache.delete(key);
      }
    }
    notifySSEClients();
  });

  watcher.on("add", () => {
    // New file: rebuild all maps on next request
    pageFileMap.clear();
    iblockFileMap.clear();
    pageCache.clear();
    notifySSEClients();
  });
}

export function stopServer(): void {
  watcher?.close();
  bunServer?.stop(true);
  watcher = null;
  bunServer = null;
  sseClients.clear();
  pageCache.clear();
}

export function isRunning(): boolean {
  return bunServer !== null;
}
