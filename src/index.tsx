import React from "react";
import { render } from "ink";
import { App } from "./ui/App.js";
import { state } from "./core/state.js";
import { loadConfig } from "./core/config.js";

// Register all commands (side-effect imports)
import "./commands/project.js";
import "./commands/server.js";

// Restore saved project config
const config = loadConfig();
if (config) {
  state.projectId = config.projectId;
  state.apiToken = config.apiToken;
}

render(<App />);
