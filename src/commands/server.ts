import { registerCommand } from "./registry.js";
import { state, notifyStateChange } from "../core/state.js";
import { join } from "path";
import { existsSync } from "fs";

registerCommand({
  name: "server start",
  description: "Start dev server: server start [port]",
  async handler(args, ctx) {
    if (state.serverProcess) {
      ctx.log(`Server already running on :${state.serverPort}`);
      return;
    }
    const port = parseInt(args[0] ?? "3000", 10);
    const watchPath = join(process.cwd(), "watch.js");
    if (!existsSync(watchPath)) {
      ctx.log("watch.js not found in current directory.");
      return;
    }
    const proc = Bun.spawn(["bun", watchPath], {
      env: { ...process.env, PORT: String(port) },
      stdout: "pipe",
      stderr: "pipe",
    });
    state.serverProcess = proc;
    state.serverPort = port;
    notifyStateChange();
    ctx.log(`✓ Server started on http://localhost:${port}`);
  },
});

registerCommand({
  name: "server stop",
  description: "Stop dev server",
  async handler(_args, ctx) {
    if (!state.serverProcess) {
      ctx.log("Server is not running.");
      return;
    }
    state.serverProcess.kill();
    state.serverProcess = null;
    state.serverPort = null;
    notifyStateChange();
    ctx.log("✓ Server stopped.");
  },
});
