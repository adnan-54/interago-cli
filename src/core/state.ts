interface ServerProcess {
  kill: () => void;
}

interface AppState {
  projectId: string | null;
  apiToken: string | null;
  serverProcess: ServerProcess | null;
  serverPort: number | null;
  onStateChange: (() => void) | null;
}

export const state: AppState = {
  projectId: null,
  apiToken: null,
  serverProcess: null,
  serverPort: null,
  onStateChange: null,
};

export function notifyStateChange() {
  state.onStateChange?.();
}
