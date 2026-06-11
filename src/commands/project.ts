import { registerCommand } from "./registry.js";
import type { AppContext } from "./registry.js";
import { saveConfig } from "../core/config.js";
import { state, notifyStateChange } from "../core/state.js";
import { readdirSync, existsSync } from "fs";
import { join } from "path";

function listHtmlFiles(dir: string): string[] {
  const results: string[] = [];
  function walk(sub: string) {
    for (const entry of readdirSync(sub, { withFileTypes: true })) {
      const full = join(sub, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith(".html")) results.push(full);
    }
  }
  walk(dir);
  return results;
}

/** Called by App on first launch when no project is configured. */
export async function runProjectInit(ctx: AppContext): Promise<void> {
  const projectId = await ctx.prompt("Project ID: ");
  const apiToken = await ctx.prompt("API Token: ");
  saveConfig({ projectId, apiToken });
  state.projectId = projectId;
  state.apiToken = apiToken;
  notifyStateChange();
  ctx.log(`✓ Project set: ${projectId}`);
}

registerCommand({
  name: "project",
  description: "Show current project info",
  async handler(_args, ctx) {
    if (!state.projectId) {
      ctx.log("No project configured.");
      return;
    }
    const cwd = process.cwd();
    const pagesDir = join(cwd, "pages");
    const blocksDir = join(cwd, "blocks");
    const pageCount = existsSync(pagesDir) ? listHtmlFiles(pagesDir).length : 0;
    const blockCount = existsSync(blocksDir)
      ? readdirSync(blocksDir).filter((f) => f.endsWith(".html")).length
      : 0;
    ctx.log(`Project ID:  ${state.projectId}`);
    ctx.log(`Pages:       ${pageCount}`);
    ctx.log(`Blocks:      ${blockCount}`);
  },
});
