const MAX_REQUESTS = 59;
const WINDOW_MS = 60_000;
const timestamps: number[] = [];

function purgeOld(): void {
  const cutoff = Date.now() - WINDOW_MS;
  while (timestamps.length > 0 && timestamps[0] <= cutoff) {
    timestamps.shift();
  }
}

export async function throttle(): Promise<void> {
  purgeOld();
  if (timestamps.length >= MAX_REQUESTS) {
    const waitUntil = timestamps[0] + WINDOW_MS;
    const delay = waitUntil - Date.now() + 50;
    await sleep(delay > 0 ? delay : 50);
    return throttle();
  }
  timestamps.push(Date.now());
}

export function getRequestCount(): number {
  purgeOld();
  return timestamps.length;
}

function sleep(ms: number) {
  return new Promise<void>(resolve => setTimeout(resolve, ms));
}
