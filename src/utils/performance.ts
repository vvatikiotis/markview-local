/**
 * Performance utilities for optimizing MarkView
 */

/**
 * Debounce function - delays execution until after wait time has elapsed
 * since the last call
 */
export function debounce<Args extends unknown[], This, Result>(
  func: (this: This, ...args: Args) => Result,
  wait: number
): (this: This, ...args: Args) => void {
  let timeout: number | null = null;

  return function executedFunction(this: This, ...args: Args) {
    const context = this;
    const later = () => {
      timeout = null;
      func.apply(context, args);
    };

    if (timeout !== null) {
      clearTimeout(timeout);
    }
    timeout = window.setTimeout(later, wait);
  };
}

/**
 * Throttle function - executes at most once per wait time
 */
export function throttle<Args extends unknown[], This, Result>(
  func: (this: This, ...args: Args) => Result,
  wait: number
): (this: This, ...args: Args) => void {
  let inThrottle = false;

  return function executedFunction(this: This, ...args: Args) {
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, wait);
    }
  };
}
