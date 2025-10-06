/**
 * Simple debounce utility for main process
 * Collapses rapid successive calls into a single invocation after the delay.
 */
export function debounce<T extends (...args: Array<unknown>) => void>(fn: T, delayMs: number): T {
  let timer: NodeJS.Timeout | null = null;
  return function (this: unknown, ...args: Parameters<T>) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      fn.apply(this, args);
    }, delayMs);
  } as T;
}
