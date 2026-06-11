import { registerCommand } from "./registry.js";
import type { AppContext } from "./registry.js";
import { state } from "../core/state.js";
import { apiCall } from "../core/api.js";
import { mkdirSync, writeFileSync, readdirSync, existsSync } from "fs";
import { join, dirname } from "path";

// ── Helpers ──────────────────────────────────────────────────────────────────

type Api = { projectId: string; apiToken: string };

function getApi(ctx: AppContext): Api | null {
  if (!state.projectId || !state.apiToken) {
    ctx.log("No project set. Run: project init [id] [token]");
    return null;
  }
  return { projectId: state.projectId, apiToken: state.apiToken };
}

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

async function fetchAndWriteBlock(
  api: Api,
  blockinwebsiteId: string,
  blockName: string,
  cwd: string,
  ctx: AppContext
): Promise<void> {
  const detail = await apiCall(api, {
    module: "pages",
    method: "getBlock",
    blockinwebsiteId,
    includeContent: "1",
  });
  const block = detail.block ?? {};
  const content: string = block.content ?? "";
  const filename = `${blockName} - ${blockinwebsiteId}.html`;
  writeFileSync(join(cwd, "blocks", filename), content, "utf8");

  if (block.blockTypeId === 4 && block.virtualContent != null) {
    const sidecar =
      typeof block.virtualContent === "string"
        ? block.virtualContent
        : JSON.stringify(block.virtualContent);
    writeFileSync(
      join(cwd, "blocks", `${blockName} - ${blockinwebsiteId}.virtual.json`),
      sidecar,
      "utf8"
    );
  }
  ctx.log(`  ✓ block: ${filename}`);
}

async function fetchAndWritePage(
  api: Api,
  pageId: string,
  slug: string,
  cwd: string,
  ctx: AppContext
): Promise<void> {
  const draft = await apiCall(api, {
    module: "pages",
    method: "getPageDraft",
    pageId,
  });
  const code: string = draft.draft?.draftCode ?? draft.draftCode ?? "";
  const filename = `${slug} - ${pageId}.html`;
  const filePath = join(cwd, "pages", filename);
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, code, "utf8");
  ctx.log(`  ✓ page: ${filename}`);
}

async function pullAllBlocks(api: Api, cwd: string, ctx: AppContext): Promise<number> {
  ctx.log("Fetching blocks…");
  mkdirSync(join(cwd, "blocks"), { recursive: true });
  let page = 1;
  let total = 0;
  while (true) {
    const res = await apiCall(api, {
      module: "pages",
      method: "listBlocks",
      page: String(page),
      pageSize: "50",
    });
    for (const b of (res.blocks ?? []) as any[]) {
      await fetchAndWriteBlock(api, String(b.blockinwebsiteId), b.blockName, cwd, ctx);
      total++;
    }
    if (!res.hasMore) break;
    page++;
  }
  return total;
}

async function pullAllPages(api: Api, cwd: string, ctx: AppContext): Promise<number> {
  ctx.log("Fetching pages…");
  mkdirSync(join(cwd, "pages"), { recursive: true });
  let page = 1;
  const collected: Array<{ slug: string; pageId: string }> = [];
  while (true) {
    const res = await apiCall(api, {
      module: "pages",
      method: "listPages",
      page: String(page),
      pageSize: "50",
    });
    for (const p of (res.pages ?? []) as any[]) {
      const slug = (p.pageUrl as string | undefined)?.replace(/^\//, "").trim() || "index";
      collected.push({ slug, pageId: String(p.pageId) });
    }
    if (!res.hasMore) break;
    page++;
  }

  const slugSet = new Set(collected.map((p) => p.slug));
  for (const p of collected) {
    if ([...slugSet].some((s) => s.startsWith(p.slug + "/"))) {
      p.slug = p.slug + "/index";
    }
  }

  let total = 0;
  for (const p of collected) {
    await fetchAndWritePage(api, p.pageId, p.slug, cwd, ctx);
    total++;
  }
  return total;
}

async function resolveBlock(
  api: Api,
  arg: string,
  cwd: string,
  ctx: AppContext
): Promise<{ blockinwebsiteId: string; blockName: string } | null> {
  const blocksDir = join(cwd, "blocks");
  if (existsSync(blocksDir)) {
    const files = readdirSync(blocksDir).filter((f) => f.endsWith(".html"));
    if (/^\d+$/.test(arg)) {
      const match = files.find((f) => f.endsWith(` - ${arg}.html`));
      if (match) return { blockinwebsiteId: arg, blockName: match.replace(/ - \d+\.html$/, "") };
    } else {
      const match = files.find(
        (f) => f.replace(/ - \d+\.html$/, "").toLowerCase() === arg.toLowerCase()
      );
      if (match) {
        const m = match.match(/ - (\d+)\.html$/);
        if (m) return { blockinwebsiteId: m[1], blockName: match.replace(/ - \d+\.html$/, "") };
      }
    }
  }

  ctx.log(`Searching API for block "${arg}"…`);
  let page = 1;
  while (true) {
    const res = await apiCall(api, {
      module: "pages",
      method: "listBlocks",
      page: String(page),
      pageSize: "50",
    });
    const found = (res.blocks ?? []).find((b: any) =>
      /^\d+$/.test(arg)
        ? String(b.blockinwebsiteId) === arg
        : b.blockName?.toLowerCase() === arg.toLowerCase()
    );
    if (found) return { blockinwebsiteId: String(found.blockinwebsiteId), blockName: found.blockName };
    if (!res.hasMore) break;
    page++;
  }
  return null;
}

async function resolvePage(
  api: Api,
  arg: string,
  cwd: string,
  ctx: AppContext
): Promise<{ pageId: string; slug: string } | null> {
  const pagesDir = join(cwd, "pages");
  if (existsSync(pagesDir)) {
    const files = listHtmlFiles(pagesDir);
    if (/^\d+$/.test(arg)) {
      const match = files.find((f) => f.endsWith(` - ${arg}.html`));
      if (match) return { pageId: arg, slug: match.replace(/ - \d+\.html$/, "") };
    } else {
      const match = files.find(
        (f) => f.replace(/ - \d+\.html$/, "").toLowerCase() === arg.toLowerCase()
      );
      if (match) {
        const m = match.match(/ - (\d+)\.html$/);
        if (m) return { pageId: m[1], slug: match.replace(/ - \d+\.html$/, "") };
      }
    }
  }

  ctx.log(`Searching API for page "${arg}"…`);
  let page = 1;
  while (true) {
    const res = await apiCall(api, {
      module: "pages",
      method: "listPages",
      page: String(page),
      pageSize: "50",
    });
    const found = (res.pages ?? []).find((p: any) => {
      const slug = (p.pageUrl as string | undefined)?.replace(/^\//, "").trim() || "index";
      return /^\d+$/.test(arg)
        ? String(p.pageId) === arg
        : slug.toLowerCase() === arg.toLowerCase();
    });
    if (found) {
      const slug = (found.pageUrl as string | undefined)?.replace(/^\//, "").trim() || "index";
      return { pageId: String(found.pageId), slug };
    }
    if (!res.hasMore) break;
    page++;
  }
  return null;
}

// ── Commands ─────────────────────────────────────────────────────────────────

registerCommand({
  name: "pull",
  description: "Download all pages and blocks from current project",
  async handler(_args, ctx) {
    const api = getApi(ctx);
    if (!api) return;
    const cwd = process.cwd();
    const [totalPages, totalBlocks] = await Promise.all([
      pullAllPages(api, cwd, ctx),
      pullAllBlocks(api, cwd, ctx),
    ]);
    ctx.log(`✓ Done — ${totalPages} pages, ${totalBlocks} blocks.`);
  },
});

registerCommand({
  name: "pull pages",
  description: "Download all pages from current project",
  async handler(_args, ctx) {
    const api = getApi(ctx);
    if (!api) return;
    const cwd = process.cwd();
    const total = await pullAllPages(api, cwd, ctx);
    ctx.log(`✓ Done — ${total} pages.`);
  },
});

registerCommand({
  name: "pull page",
  description: "Download a single page: pull page <name|id>",
  async handler([arg], ctx) {
    const api = getApi(ctx);
    if (!api) return;
    if (!arg) { ctx.log("Usage: pull page <name|id>"); return; }
    const cwd = process.cwd();
    mkdirSync(join(cwd, "pages"), { recursive: true });
    const resolved = await resolvePage(api, arg, cwd, ctx);
    if (!resolved) { ctx.log(`Page not found: ${arg}`); return; }
    await fetchAndWritePage(api, resolved.pageId, resolved.slug, cwd, ctx);
    ctx.log("✓ Done.");
  },
});

registerCommand({
  name: "pull blocks",
  description: "Download all blocks from current project",
  async handler(_args, ctx) {
    const api = getApi(ctx);
    if (!api) return;
    const cwd = process.cwd();
    const total = await pullAllBlocks(api, cwd, ctx);
    ctx.log(`✓ Done — ${total} blocks.`);
  },
});

registerCommand({
  name: "pull block",
  description: "Download a single block: pull block <name|id>",
  async handler([arg], ctx) {
    const api = getApi(ctx);
    if (!api) return;
    if (!arg) { ctx.log("Usage: pull block <name|id>"); return; }
    const cwd = process.cwd();
    mkdirSync(join(cwd, "blocks"), { recursive: true });
    const resolved = await resolveBlock(api, arg, cwd, ctx);
    if (!resolved) { ctx.log(`Block not found: ${arg}`); return; }
    await fetchAndWriteBlock(api, resolved.blockinwebsiteId, resolved.blockName, cwd, ctx);
    ctx.log("✓ Done.");
  },
});
