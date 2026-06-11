# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```powershell
bun start              # Run dev (no hot reload for ink/TUI)
bun dev                # Run with --hot (limited effect in TUI)
bun run build          # Compile interago.exe (patches yoga-wasm-web first)
pwsh -ExecutionPolicy Bypass -File .\scripts\install.ps1  # Build + install to PATH
```

No test suite exists. Type-check only: `bunx tsc --noEmit`.

## Architecture

**Runtime:** Bun. **UI:** [ink](https://github.com/vadimdemedes/ink) — React rendered to terminal. The entire TUI is a React component tree rendered once via `ink`'s `render()`.

### Data flow

`src/core/state.ts` holds a single mutable singleton (`state`). React components don't subscribe via context — instead `App.tsx` registers a `state.onStateChange` callback that calls `forceUpdate`, causing re-render when state mutates (e.g. after API calls update the request counter).

### Command system

`src/commands/registry.ts` is a simple command bus. Commands self-register by importing `registerCommand` (side-effect imports in `index.tsx`). `dispatch()` resolves compound commands like `"server start"` before falling back to simple names.

The `AppContext` passed to handlers provides two primitives: `log(msg)` (appends to terminal output) and `prompt(question)` (suspends input loop, awaits user reply via React state + a Promise ref in `App.tsx`).

### Dev server

`src/server/index.ts` runs a `Bun.serve` HTTP server. Pages are compiled **on demand** — `<iBlock name="x" />` tags are replaced by reading the matching file from `blocks/`. Compiled HTML is cached in memory; cache is invalidated by chokidar watchers on `pages/` and `blocks/`. Live reload uses SSE (`/__reload` endpoint); a 25s heartbeat keeps connections alive past Bun's idle timeout.

### Build

`scripts/build.ts` patches `yoga-wasm-web/package.json` before compiling to redirect `./auto` → a pure-JS asm wrapper (no `.wasm` file needed in the binary), then restores the original after `bun build --compile` finishes. This is required because the WASM path resolution breaks inside Bun's compiled binary.

### Config

`.interago.json` is written to the **user's working directory** (wherever they run `interago`), not the repo root. `src/core/config.ts` handles read/write.
