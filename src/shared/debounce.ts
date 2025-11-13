/**
 * Generic function type - accepts any function signature
 * Using `any` here is intentional to support contravariance for maximum flexibility
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type GenericFunction = (...args: Array<any>) => void;

/**
 * Debounced function with cancel method
 */
export interface DebouncedFunction<T extends GenericFunction> {
  (...args: Parameters<T>): void;
  cancel(): void;
}

/**
 * Simple debounce utility for both main and renderer processes
 * Collapses rapid successive calls into a single invocation after the delay.
 * Returns a debounced function with a cancel() method to cancel pending execution.
 */
export function debounce<T extends GenericFunction>(fn: T, delayMs: number): DebouncedFunction<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;

  const debounced = function (this: unknown, ...args: Parameters<T>) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      fn.apply(this, args);
      timer = null;
    }, delayMs);
  };

  debounced.cancel = function () {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  };

  return debounced as DebouncedFunction<T>;
}
