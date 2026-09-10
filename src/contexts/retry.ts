export function forwardRetry(requestSync: () => void): void {
  requestSync();
}
