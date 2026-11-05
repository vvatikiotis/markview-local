import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('@core/storage', async importOriginal => {
  const original = await importOriginal<typeof import('@core/storage')>();
  return { ...original, getSettings: vi.fn().mockResolvedValue(original.DEFAULT_SETTINGS) };
});
vi.mock('@utils/sandbox-detection', () => ({ isSandboxed: vi.fn().mockReturnValue(false) }));
vi.mock('@utils/notification', () => ({ showNotification: vi.fn() }));
import { ActionButtons } from '@components/action-buttons';
import { isSandboxed } from '@utils/sandbox-detection';
import { showNotification } from '@utils/notification';

const originalPrint = window.print;
beforeEach(() => {
  window.print = vi.fn();
  document.body.innerHTML = '';
});
afterEach(() => {
  vi.restoreAllMocks();
  window.print = originalPrint;
  vi.mocked(isSandboxed).mockReturnValue(false);
  vi.mocked(showNotification).mockClear();
  document.body.innerHTML = '';
});

async function printMenuListener() {
  const actions = new ActionButtons();
  const listeners = vi.spyOn(HTMLButtonElement.prototype, 'addEventListener');
  await actions['createMenu']();
  const button = document.querySelector<HTMLButtonElement>('.markview-menu-item');
  if (!button) throw new Error('Missing print action');
  const listener = listeners.mock.calls.find(
    (call, index) => call[0] === 'click' && listeners.mock.contexts[index] === button
  )?.[1];
  if (typeof listener !== 'function') throw new Error('Missing print click listener');
  return () => listener.call(button, new MouseEvent('click', { cancelable: true }));
}

describe('action-buttons click Promise contract', () => {
  it('runs actions immediately and returns a resolved Promise', async () => {
    const print = vi.spyOn(window, 'print').mockImplementation(() => {});
    const click = await printMenuListener();
    const pending = click();
    expect(pending).toBeInstanceOf(Promise);
    expect(print).toHaveBeenCalledOnce();
    await expect(pending).resolves.toBeUndefined();
  });

  it('retains rejected-Promise error propagation instead of synchronous throws', async () => {
    const failure = new Error('print unavailable');
    vi.spyOn(window, 'print').mockImplementation(() => {
      throw failure;
    });
    const click = await printMenuListener();
    await expect(click()).rejects.toBe(failure);
  });

  it('uses the statically imported notification for restricted actions', async () => {
    vi.mocked(isSandboxed).mockReturnValue(true);
    const print = vi.spyOn(window, 'print').mockImplementation(() => {});
    const click = await printMenuListener();
    await expect(click()).resolves.toBeUndefined();
    expect(print).not.toHaveBeenCalled();
    expect(showNotification).toHaveBeenCalledWith(expect.any(String), 'info', 3000);
  });
});
