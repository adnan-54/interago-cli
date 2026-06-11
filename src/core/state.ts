interface AppState {
  projectId: string | null;
  apiToken: string | null;
  serverPort: number | null;
  onStateChange: (() => void) | null;
}

export const state: AppState = {
  projectId: null,
  apiToken: null,
  serverPort: null,
  onStateChange: null,
};

export function notifyStateChange() {
  state.onStateChange?.();
}
