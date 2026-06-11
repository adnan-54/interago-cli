# PRD-08: Push Page Commands
**Goal:** Upload single page or all pages to Interago with validate-then-apply flow.
**Deliverables:**
- In `src/commands/push.ts`:
  - `pushPage(api, pageId, slug, cwd, ctx)` — reads `.html`, calls `proposePageDraft` then `applyPageDraft`; aborts on propose error
  - `pushAllPages(api, cwd, ctx)` — scans `pages/` recursively, calls `pushPage` per file, returns `{ ok, err }`
  - `resolvePageFile(arg, cwd)` — match local file by slug or id (recursive scan)
- Commands: `push page <name|id>`, `push pages`
**Done when:** `push page index` logs propose+apply success; `push pages` prints summary with ok/err counts.
