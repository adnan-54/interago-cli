# PRD-05: Wire & Smoke Test
**Goal:** Entry point wires everything; end-to-end test.
**Deliverables:**
- `src/index.tsx` — imports all command modules (side-effect register); loadConfig → state; render(<App/>)
**Smoke test sequence (real terminal):**
```
bun start
> project 701 REDACTED
> pull
> server start
> server stop
> exit
```
**Done when:** status bar updates on project/server change; pull creates pages/ and iblocks/ files; server spawns watch.js on given port.
