import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('@utils/dom', () => ({ extractMarkdownSource: () => '# original' }));
vi.mock('@utils/notification', () => ({ showNotification: vi.fn() }));
import {
  resetAutoRefreshState,
  startAutoRefresh,
  startLocalFileAutoRefresh,
} from '@utils/auto-refresh';
import { showNotification } from '@utils/notification';

beforeEach(() => {
  vi.useFakeTimers();
  vi.mocked(showNotification).mockReset();
});
afterEach(() => {
  resetAutoRefreshState();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function replyWith(response: unknown): void {
  vi.mocked(chrome.runtime.sendMessage).mockImplementation((...args: unknown[]) => {
    const callback = args[1];
    if (typeof callback === 'function') callback(response);
    return Promise.resolve();
  });
}

describe('auto-refresh boundaries and Promise contracts', () => {
  it.each([
    null,
    undefined,
    false,
    'text',
    {},
    { content: 123 },
    { content: {} },
    { error: 'failed', content: '# changed' },
  ])('ignores malformed/failed reply %j', response => {
    replyWith(response);
    const onChange = vi.fn().mockResolvedValue(undefined);
    startAutoRefresh(10, onChange);
    expect(() => vi.advanceTimersByTime(10)).not.toThrow();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('retains pre extraction, change notification and duplicate suppression', async () => {
    replyWith({ success: true, content: '<pre># changed</pre>' });
    const onChange = vi.fn().mockResolvedValue(undefined);
    startAutoRefresh(10, onChange);
    await vi.advanceTimersByTimeAsync(20);
    expect(onChange).toHaveBeenCalledExactlyOnceWith('# changed');
    expect(showNotification).toHaveBeenCalledOnce();
  });

  it('still swallows synchronous messaging failures in the timer', () => {
    vi.mocked(chrome.runtime.sendMessage).mockImplementation(() => {
      throw new Error('context invalid');
    });
    startAutoRefresh(10, vi.fn().mockResolvedValue(undefined));
    expect(() => vi.advanceTimersByTime(10)).not.toThrow();
  });

  it('returns a Promise and shows local-file unavailability immediately', async () => {
    const pending = startLocalFileAutoRefresh(10, vi.fn().mockResolvedValue(undefined));
    expect(pending).toBeInstanceOf(Promise);
    expect(showNotification).toHaveBeenCalledOnce();
    await expect(pending).resolves.toBeUndefined();
  });

  it('rejects rather than throwing when the local-file notification fails', async () => {
    const failure = new Error('notification failed');
    vi.mocked(showNotification).mockImplementation(() => {
      throw failure;
    });
    await expect(startLocalFileAutoRefresh(10, vi.fn().mockResolvedValue(undefined))).rejects.toBe(
      failure
    );
  });
});
