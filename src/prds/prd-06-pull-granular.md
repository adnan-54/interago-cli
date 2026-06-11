# PRD-06: Granular Pull Commands + virtualContent Sidecar
**Goal:** Break monolithic `project pull` into shared helpers; add single-item and scoped pull commands; preserve type 4 block data.
**Deliverables:**
- `src/commands/project.ts` refactored:
  - `fetchAndWriteBlock` — fetches block, writes `.html`; if `blockTypeId === 4` also writes `.virtual.json` sidecar
  - `fetchAndWritePage` — fetches getPageDraft, writes `.html`
  - `pullAllBlocks(api, cwd, ctx)` / `pullAllPages(api, cwd, ctx)` shared helpers
  - `resolveBlock(api, arg, cwd, ctx)` / `resolvePage(api, arg, cwd, ctx)` — match by name or id (local scan first, API fallback)
- Commands registered: `pull blocks`, `pull block <name|id>`, `pull pages`, `pull page <name|id>`
- `project pull` preserved (calls both helpers)
**Done when:** `bunx tsc --noEmit` exits 0; `pull block header` writes single block file; type 4 block produces `.virtual.json` alongside `.html`.
