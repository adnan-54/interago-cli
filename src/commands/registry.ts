export interface AppContext {
  log: (msg: string) => void;
  prompt: (question: string) => Promise<string>;
}

export interface Command {
  name: string;
  description: string;
  handler: (args: string[], ctx: AppContext) => Promise<void>;
}

const commands: Command[] = [];

export function registerCommand(cmd: Command) {
  commands.push(cmd);
}

export function listCommands(): Command[] {
  return [...commands];
}

export async function dispatch(input: string, ctx: AppContext): Promise<void> {
  const parts = input.trim().split(/\s+/);
  const [verb, sub, ...rest] = parts;

  // Try compound verb (e.g. "server start")
  if (sub) {
    const compound = commands.find(c => c.name === `${verb} ${sub}`);
    if (compound) {
      await compound.handler(rest, ctx);
      return;
    }
  }

  const cmd = commands.find(c => c.name === verb);
  if (!cmd) {
    const names = commands.map(c => c.name).join(", ");
    ctx.log(`Unknown command: "${verb}". Available: ${names}`);
    return;
  }
  await cmd.handler(parts.slice(1), ctx);
}
