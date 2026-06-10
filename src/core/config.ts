import { existsSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

const CONFIG_FILE = join(process.cwd(), ".interago.json");

export interface Config {
  projectId: string;
  apiToken: string;
}

export function loadConfig(): Config | null {
  if (!existsSync(CONFIG_FILE)) return null;
  try {
    return JSON.parse(readFileSync(CONFIG_FILE, "utf8"));
  } catch {
    return null;
  }
}

export function saveConfig(config: Config): void {
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), "utf8");
}
