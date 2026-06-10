# PRD-02: Core
**Goal:** Shared services; no UI, no commands.
**Deliverables:**
- `src/core/rateLimiter.ts` — sliding window, max 59 req/60 s, async throttle()
- `src/core/api.ts` — apiCall(ctx, params) → JSON; throws on HTTP or API error; calls throttle()
- `src/core/config.ts` — loadConfig() / saveConfig() → `.interago.json` in cwd
- `src/core/state.ts` — singleton {projectId, apiToken, serverProcess, serverPort, onStateChange}
**Done when:** tsc clean, units importable.
