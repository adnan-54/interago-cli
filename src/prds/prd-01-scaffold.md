# PRD-01: Scaffold
**Goal:** Bun + TypeScript project skeleton.
**Deliverables:**
- `package.json` — ink, ink-text-input, react, @types/bun, typescript
- `tsconfig.json` — ESNext, bundler resolution, react-jsx
- `src/` folder tree: core/, commands/, ui/, prds/
- `.gitignore` — node_modules, compiled, .interago.json
- `watch.js` patched: `const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000`
**Done when:** `bunx tsc --noEmit` exits 0.
