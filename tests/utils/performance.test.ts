import { afterEach, beforeEach, describe, expect, expectTypeOf, it, vi } from 'vitest';
import { debounce, throttle } from '@utils/performance';
import { debounce as debounceDom } from '@utils/dom';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

for (const [name, wrap] of [
  ['performance debounce', debounce],
  ['dom debounce', debounceDom],
] as const) {
  describe(name, () => {
    it('infers argument tuples and returns void even for a value-returning callback', () => {
      const wrapped = wrap(
        (count: number, label: string, optional?: boolean) => `${label}${count}${optional}`,
        20
      );
      expectTypeOf(wrapped).parameters.toEqualTypeOf<[number, string, boolean?]>();
      expectTypeOf(wrapped).returns.toEqualTypeOf<void>();
      expect(wrapped(1, 'one')).toBeUndefined();
    });

    it('delays until the last call and preserves its arguments and receiver', () => {
      const calls = vi.fn();
      const wrapped = wrap(function (this: { id: string }, count: number, label: string) {
        calls(this.id, count, label);
        return count;
      }, 20);
      expectTypeOf(wrapped).thisParameter.toEqualTypeOf<{ id: string }>();
      wrapped.call({ id: 'first' }, 1, 'one');
      vi.advanceTimersByTime(10);
      expect(wrapped.call({ id: 'last' }, 2, 'two')).toBeUndefined();
      vi.advanceTimersByTime(19);
      expect(calls).not.toHaveBeenCalled();
      vi.advanceTimersByTime(1);
      expect(calls).toHaveBeenCalledExactlyOnceWith('last', 2, 'two');
      wrapped.call({ id: 'next' }, 3, 'three');
      vi.advanceTimersByTime(20);
      expect(calls).toHaveBeenLastCalledWith('next', 3, 'three');
    });
  });
}

describe('throttle', () => {
  it('keeps leading-only timing, receiver, inferred arguments and void return', () => {
    const calls = vi.fn();
    const wrapped = throttle(function (this: { id: string }, count: number, label: string) {
      calls(this.id, count, label);
      return count;
    }, 20);
    expectTypeOf(wrapped).parameters.toEqualTypeOf<[number, string]>();
    expectTypeOf(wrapped).returns.toEqualTypeOf<void>();
    expectTypeOf(wrapped).thisParameter.toEqualTypeOf<{ id: string }>();
    expect(wrapped.call({ id: 'first' }, 1, 'one')).toBeUndefined();
    wrapped.call({ id: 'ignored' }, 2, 'two');
    expect(calls).toHaveBeenCalledExactlyOnceWith('first', 1, 'one');
    vi.advanceTimersByTime(20);
    expect(calls).toHaveBeenCalledTimes(1);
    wrapped.call({ id: 'next' }, 3, 'three');
    expect(calls).toHaveBeenLastCalledWith('next', 3, 'three');
  });
});
