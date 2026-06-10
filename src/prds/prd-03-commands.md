# PRD-03: Commands
**Goal:** Extensible command registry + 3 command modules.
**Deliverables:**
- `src/commands/registry.ts` — registerCommand({name, description, handler}); dispatch(input, ctx)
- `src/commands/project.ts` — sets projectId + apiToken, prompts if missing, saves config
- `src/commands/pull.ts` — listPages→getPageDraft→pages/{url} - {id}.html; listBlocks→getBlock→iblocks/{name} - {id}.html
- `src/commands/server.ts` — "server start [port]": Bun.spawn(watch.js, PORT env); "server stop": kill
**Extension:** add command = new file + registerCommand() call + import in index.tsx.
**Done when:** tsc clean.
