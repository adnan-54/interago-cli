import { registerCommand } from "./registry.js";
import { state, notifyStateChange } from "../core/state.js";
import { startServer, stopServer } from "../server/index.js";

registerCommand({
  name: "server start",
  description: "Start dev server: server start [port]",
  async handler(args, ctx) {
    if (state.serverPort !== null) {
      ctx.log(`Server already running on :${state.serverPort}`);
      return;
    }
    const port = parseInt(args[0] ?? "3000", 10);
    startServer(port, process.cwd(), ctx.log);
    state.serverPort = port;
    notifyStateChange();
    ctx.log(`✓ Server started → http://localhost:${port}`);
  },
});

registerCommand({
  name: "server stop",
  description: "Stop dev server",
  async handler(_args, ctx) {
    if (state.serverPort === null) {
      ctx.log("Server is not running.");
      return;
    }
    stopServer();
    state.serverPort = null;
    notifyStateChange();
    ctx.log("✓ Server stopped.");
  },
});
