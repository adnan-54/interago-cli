# PRD-04: UI
**Goal:** ink-based full-screen TUI; always shows status bar.
**Deliverables:**
- `src/ui/StatusBar.tsx` — Project: {id | (none)}   Server: ● :port | ○ stopped
- `src/ui/Terminal.tsx` — scrollable log lines + prompt input (ink-text-input); handles both command mode and prompted input (ctx.prompt)
- `src/ui/App.tsx` — composes StatusBar + Terminal; resolveRef pattern for async prompt(); built-in "help" and "exit" commands; wires state.onStateChange → forceUpdate
**Done when:** tsc clean; app renders without crash.
