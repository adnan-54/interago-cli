# PRD-09: Push All Commands
**Goal:** One command to push all local blocks and pages.
**Deliverables:**
- In `src/commands/push.ts`:
  - Commands `push all` and `push` — call `pushAllBlocks` then `pushAllPages`; print combined summary: "N blocks, M pages pushed. K errors."
**Done when:** `push` uploads all blocks and pages, prints final summary.
