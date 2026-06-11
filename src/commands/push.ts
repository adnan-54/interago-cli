import { registerCommand } from "./registry.js";
import type { AppContext } from "./registry.js";
import { state } from "../core/state.js";
import { apiCall } from "../core/api.js";
import { readFileSync, readdirSync, existsSync } from "fs";
import { join } from "path";

// ── Helpers ──────────────────────────────────────────────────────────────────

type Api = { projectId: string; apiToken: string };

function getApi(ctx: AppContext): Api | null {
  if (!state.projectId || !state.apiToken) {
    ctx.log("No project set. Run: project select [id] [token]");
    return null;
  }
  return { projectId: state.projectId, apiToken: state.apiToken };
}

/** List all .html files under dir recursively; returns paths relative to dir (forward slashes). */
function listHtmlFiles(dir: string): string[] {
  const results: string[] = [];
  function walk(sub: string) {
    for (const entry of readdirSync(sub, { withFileTypes: true })) {
      const full = join(sub, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.name.endsWith(".html")) {
        results.push(full.slice(dir.length + 1).replace(/\\/g, "/"));
      }
    }
  }
  walk(dir);
  return results;
}

async function pushBlock(
  api: Api,
  blockinwebsiteId: string,
  blockName: string,
  cwd: string,
  ctx: AppContext
): Promise<void> {
  const htmlPath = join(cwd, "blocks", `${blockName} - ${blockinwebsiteId}.html`);
  const sidecarPath = join(cwd, "blocks", `${blockName} - ${blockinwebsiteId}.virtual.json`);

  const content = existsSync(sidecarPath)
    ? readFileSync(sidecarPath, "utf8")
    : readFileSync(htmlPath, "utf8");

  const params = { blockinwebsiteId, content };

  await apiCall(api, { module: "pages", method: "proposeBlockContent", ...params });
  await apiCall(api, { module: "pages", method: "applyBlockContent", ...params });
  ctx.log(`  ✓ block: ${blockName} - ${blockinwebsiteId}`);
}

async function pushPage(
  api: Api,
  pageId: string,
  slug: string,
  cwd: string,
  ctx: AppContext
): Promise<void> {
  const filename = `${slug} - ${pageId}.html`;
  const draftCode = readFileSync(join(cwd, "pages", filename), "utf8");

  await apiCall(api, { module: "pages", method: "proposePageDraft", pageId, draftCode });
  await apiCall(api, { module: "pages", method: "applyPageDraft", pageId, draftCode });
  ctx.log(`  ✓ page: ${filename}`);
}

function parseBlockFile(rel: string): { blockinwebsiteId: string; blockName: string } | null {
  const m = rel.match(/^(.+) - (\d+)\.html$/);
  if (!m) return null;
  return { blockName: m[1], blockinwebsiteId: m[2] };
}

function parsePageFile(rel: string): { pageId: string; slug: string } | null {
  const m = rel.match(/^(.+) - (\d+)\.html$/);
  if (!m) return null;
  return { slug: m[1], pageId: m[2] };
}

async function pushAllBlocks(api: Api, cwd: string, ctx: AppContext): Promise<{ ok: number; err: number }> {
  const blocksDir = join(cwd, "blocks");
  if (!existsSync(blocksDir)) {
    ctx.log("No blocks/ directory found.");
    return { ok: 0, err: 0 };
  }
  const files = readdirSync(blocksDir).filter((f) => f.endsWith(".html"));
  let ok = 0;
  let err = 0;
  for (const rel of files) {
    const parsed = parseBlockFile(rel);
    if (!parsed) continue;
    try {
      await pushBlock(api, parsed.blockinwebsiteId, parsed.blockName, cwd, ctx);
      ok++;
    } catch (e: any) {
      ctx.log(`  ✗ block: ${rel} — ${e?.message ?? e}`);
      err++;
    }
  }
  return { ok, err };
}

async function pushAllPages(api: Api, cwd: string, ctx: AppContext): Promise<{ ok: number; err: number }> {
  const pagesDir = join(cwd, "pages");
  if (!existsSync(pagesDir)) {
    ctx.log("No pages/ directory found.");
    return { ok: 0, err: 0 };
  }
  const files = listHtmlFiles(pagesDir);
  let ok = 0;
  let err = 0;
  for (const rel of files) {
    const parsed = parsePageFile(rel);
    if (!parsed) continue;
    try {
      await pushPage(api, parsed.pageId, parsed.slug, cwd, ctx);
      ok++;
    } catch (e: any) {
      ctx.log(`  ✗ page: ${rel} — ${e?.message ?? e}`);
      err++;
    }
  }
  return { ok, err };
}

function resolveBlockFile(
  arg: string,
  cwd: string
): { blockinwebsiteId: string; blockName: string } | null {
  const blocksDir = join(cwd, "blocks");
  if (!existsSync(blocksDir)) return null;
  const files = readdirSync(blocksDir).filter((f) => f.endsWith(".html"));
  const match = /^\d+$/.test(arg)
    ? files.find((f) => f.endsWith(` - ${arg}.html`))
    : files.find((f) => f.replace(/ - \d+\.html$/, "").toLowerCase() === arg.toLowerCase());
  if (!match) return null;
  return parseBlockFile(match);
}

function resolvePageFile(
  arg: string,
  cwd: string
): { pageId: string; slug: string } | null {
  const pagesDir = join(cwd, "pages");
  if (!existsSync(pagesDir)) return null;
  const files = listHtmlFiles(pagesDir);
  const match = /^\d+$/.test(arg)
    ? files.find((f) => f.endsWith(` - ${arg}.html`))
    : files.find((f) => f.replace(/ - \d+\.html$/, "").toLowerCase() === arg.toLowerCase());
  if (!match) return null;
  return parsePageFile(match);
}

// ── Commands ─────────────────────────────────────────────────────────────────

registerCommand({
  name: "push block",
  description: "Upload a single block: push block <name|id>",
  async handler([arg], ctx) {
    const api = getApi(ctx);
    if (!api) return;
    if (!arg) {
      ctx.log("Usage: push block <name|id>");
      return;
    }
    const cwd = process.cwd();
    const resolved = resolveBlockFile(arg, cwd);
    if (!resolved) {
      ctx.log(`Block not found locally: ${arg}`);
      return;
    }
    try {
      await pushBlock(api, resolved.blockinwebsiteId, resolved.blockName, cwd, ctx);
      ctx.log("✓ Done.");
    } catch (e: any) {
      ctx.log(`✗ ${e?.message ?? e}`);
    }
  },
});

registerCommand({
  name: "push blocks",
  description: "Upload all blocks to current project",
  async handler(_args, ctx) {
    const api = getApi(ctx);
    if (!api) return;
    const cwd = process.cwd();
    ctx.log("Pushing blocks…");
    const { ok, err } = await pushAllBlocks(api, cwd, ctx);
    ctx.log(`✓ Done — ${ok} pushed, ${err} errors.`);
  },
});

registerCommand({
  name: "push page",
  description: "Upload a single page: push page <name|id>",
  async handler([arg], ctx) {
    const api = getApi(ctx);
    if (!api) return;
    if (!arg) {
      ctx.log("Usage: push page <name|id>");
      return;
    }
    const cwd = process.cwd();
    const resolved = resolvePageFile(arg, cwd);
    if (!resolved) {
      ctx.log(`Page not found locally: ${arg}`);
      return;
    }
    try {
      await pushPage(api, resolved.pageId, resolved.slug, cwd, ctx);
      ctx.log("✓ Done.");
    } catch (e: any) {
      ctx.log(`✗ ${e?.message ?? e}`);
    }
  },
});

registerCommand({
  name: "push pages",
  description: "Upload all pages to current project",
  async handler(_args, ctx) {
    const api = getApi(ctx);
    if (!api) return;
    const cwd = process.cwd();
    ctx.log("Pushing pages…");
    const { ok, err } = await pushAllPages(api, cwd, ctx);
    ctx.log(`✓ Done — ${ok} pushed, ${err} errors.`);
  },
});

registerCommand({
  name: "push all",
  description: "Upload all blocks and pages to current project",
  async handler(_args, ctx) {
    const api = getApi(ctx);
    if (!api) return;
    const cwd = process.cwd();
    ctx.log("Pushing blocks…");
    const blocks = await pushAllBlocks(api, cwd, ctx);
    ctx.log("Pushing pages…");
    const pages = await pushAllPages(api, cwd, ctx);
    const totalErr = blocks.err + pages.err;
    ctx.log(
      `✓ Done — ${blocks.ok} blocks, ${pages.ok} pages pushed.${totalErr ? ` ${totalErr} errors.` : ""}`
    );
  },
});

registerCommand({
  name: "push",
  description: "Upload all blocks and pages (alias for push all)",
  async handler(_args, ctx) {
    const api = getApi(ctx);
    if (!api) return;
    const cwd = process.cwd();
    ctx.log("Pushing blocks…");
    const blocks = await pushAllBlocks(api, cwd, ctx);
    ctx.log("Pushing pages…");
    const pages = await pushAllPages(api, cwd, ctx);
    const totalErr = blocks.err + pages.err;
    ctx.log(
      `✓ Done — ${blocks.ok} blocks, ${pages.ok} pages pushed.${totalErr ? ` ${totalErr} errors.` : ""}`
    );
  },
});
