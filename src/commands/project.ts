import { registerCommand } from "./registry.js";
import { saveConfig } from "../core/config.js";
import { state, notifyStateChange } from "../core/state.js";

registerCommand({
  name: "project init",
  description: "Set current project: project init [id] [token]",
  async handler(args, ctx) {
    let [projectId, apiToken] = args;
    if (!projectId) projectId = await ctx.prompt("Project ID: ");
    if (!apiToken) apiToken = await ctx.prompt("API Token: ");
    saveConfig({ projectId, apiToken });
    state.projectId = projectId;
    state.apiToken = apiToken;
    notifyStateChange();
    ctx.log(`✓ Project set: ${projectId}`);
  },
});
