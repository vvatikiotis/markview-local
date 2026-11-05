import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('@utils/logger', () => ({ logger: { log: vi.fn(), error: vi.fn(), warn: vi.fn() } }));
import { RecentTab } from '../../src/popup/recent-tab';
import { logger } from '@utils/logger';

beforeEach(() => {
  document.body.innerHTML = '';
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.mocked(logger.error).mockReset();
});

describe('recent-tab open document Promise contract', () => {
  it('requests a new tab immediately but does not wait for its callback', async () => {
    chrome.tabs.create = vi.fn();
    const recent = new RecentTab(document.body);
    const pending = recent['openRecentDocument']('file:///docs/readme.md', true);
    expect(pending).toBeInstanceOf(Promise);
    expect(chrome.tabs.create).toHaveBeenCalledWith(
      { url: 'file:///docs/readme.md' },
      expect.any(Function)
    );
    await expect(pending).resolves.toBeUndefined();
  });

  it('retains the current-tab query flow', async () => {
    vi.mocked(chrome.tabs.query).mockClear();
    const recent = new RecentTab(document.body);
    const pending = recent['openRecentDocument']('file:///docs/readme.md');
    expect(chrome.tabs.query).toHaveBeenCalledWith(
      { active: true, currentWindow: true },
      expect.any(Function)
    );
    await expect(pending).resolves.toBeUndefined();
  });

  it('preserves rejection if its error handler itself fails', async () => {
    const failure = new Error('logging failed');
    chrome.tabs.create = vi.fn().mockImplementation(() => {
      throw new Error('tabs unavailable');
    });
    vi.mocked(logger.error).mockImplementation(() => {
      throw failure;
    });
    const recent = new RecentTab(document.body);
    await expect(recent['openRecentDocument']('file:///docs/readme.md', true)).rejects.toBe(
      failure
    );
  });
});
