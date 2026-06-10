import { registerCommand } from "./registry.js";
import { apiCall } from "../core/api.js";
import { state } from "../core/state.js";
import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";

registerCommand({
  name: "pull",
  description: "Download all pages and iblocks from the project",
  async handler(_args, ctx) {
    if (!state.projectId || !state.apiToken) {
      ctx.log("No project set. Run: project {id} {token}");
      return;
    }
    const api = { projectId: state.projectId, apiToken: state.apiToken };
    const cwd = process.cwd();
    mkdirSync(join(cwd, "pages"), { recursive: true });
    mkdirSync(join(cwd, "iblocks"), { recursive: true });

    // Pages
    ctx.log("Fetching pages…");
    let page = 1;
    let totalPages = 0;
    while (true) {
      const res = await apiCall(api, {
        module: "pages",
        method: "listPages",
        page: String(page),
        pageSize: "50",
      });
      for (const p of (res.pages ?? []) as any[]) {
        const draft = await apiCall(api, {
          module: "pages",
          method: "getPageDraft",
          pageId: String(p.pageId),
        });
        const code: string =
          draft.draft?.draftCode ?? draft.draftCode ?? "";
        const filename = `${p.pageUrl || p.pageName} - ${p.pageId}.html`;
        writeFileSync(join(cwd, "pages", filename), code, "utf8");
        totalPages++;
        ctx.log(`  ✓ page: ${filename}`);
      }
      if (!res.hasMore) break;
      page++;
    }

    // iBlocks
    ctx.log("Fetching iblocks…");
    let blockPage = 1;
    let totalBlocks = 0;
    while (true) {
      const res = await apiCall(api, {
        module: "pages",
        method: "listBlocks",
        page: String(blockPage),
        pageSize: "50",
      });
      for (const b of (res.blocks ?? []) as any[]) {
        const detail = await apiCall(api, {
          module: "pages",
          method: "getBlock",
          blockinwebsiteId: String(b.blockinwebsiteId),
          includeContent: "1",
        });
        const content: string = detail.block?.content ?? "";
        const filename = `${b.blockName} - ${b.blockinwebsiteId}.html`;
        writeFileSync(join(cwd, "iblocks", filename), content, "utf8");
        totalBlocks++;
        ctx.log(`  ✓ iblock: ${filename}`);
      }
      if (!res.hasMore) break;
      blockPage++;
    }

    ctx.log(`✓ Done — ${totalPages} pages, ${totalBlocks} iblocks.`);
  },
});
