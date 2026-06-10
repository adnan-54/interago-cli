const MAX_REQUESTS = 59;
const WINDOW_MS = 60_000;
const timestamps: number[] = [];

export async function throttle(): Promise<void> {
  const now = Date.now();
  while (timestamps.length > 0 && now - timestamps[0] >= WINDOW_MS) {
    timestamps.shift();
  }
  if (timestamps.length >= MAX_REQUESTS) {
    const waitUntil = timestamps[0] + WINDOW_MS;
    const delay = waitUntil - Date.now() + 50;
    await sleep(delay > 0 ? delay : 50);
    return throttle();
  }
  timestamps.push(Date.now());
}

function sleep(ms: number) {
  return new Promise<void>(resolve => setTimeout(resolve, ms));
}
