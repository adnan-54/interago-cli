# PRD-07: Push Block Commands
**Goal:** Upload single block or all blocks to Interago with validate-then-apply flow.
**Deliverables:**
- `src/commands/push.ts` (new):
  - `pushBlock(api, blockinwebsiteId, blockName, cwd, ctx)` — reads `.virtual.json` sidecar if exists (type 4), else reads `.html`; calls `proposeBlockContent` then `applyBlockContent`; aborts on propose error
  - `pushAllBlocks(api, cwd, ctx)` — scans `blocks/*.html`, calls `pushBlock` per file, returns `{ ok, err }`
  - `resolveBlockFile(arg, cwd)` — match local file by name or id
- Commands: `push block <name|id>`, `push blocks`
- `src/index.tsx` — add `import "./commands/push.js"`
**Done when:** `push block header` logs propose+apply success; `push blocks` prints summary with ok/err counts.
