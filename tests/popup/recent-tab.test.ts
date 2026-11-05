import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('@utils/logger', () => ({ logger: { log: vi.fn(), error: vi.fn(), warn: vi.fn() } }));
import { RecentTab } from '../../src/popup/recent-tab';
import { logger } from '@utils/logger';

beforeEach(() => {
  document.body.innerHTML = '';
  chrome.tabs.query = vi.fn();
  chrome.tabs.create = vi.fn();
  chrome.tabs.update = vi.fn();
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.mocked(logger.error).mockReset();
});

describe('recent-tab open document Promise contract', () => {
  it('falls back to a new tab when no active tab is available', async () => {
    vi.mocked(chrome.tabs.query).mockImplementation((_options, callback) => {
      callback?.([]);
      return Promise.resolve([]);
    });
    const recent = new RecentTab(document.body);
    const pending = recent['openRecentDocument']('file:///docs/readme.md');
    expect(pending).toBeInstanceOf(Promise);
    expect(chrome.tabs.create).toHaveBeenCalledWith(
      { url: 'file:///docs/readme.md' },
      expect.any(Function)
    );
    await expect(pending).resolves.toBeUndefined();
  });

  it('retains the current-tab query flow without waiting for its callback', async () => {
    const recent = new RecentTab(document.body);
    const pending = recent['openRecentDocument']('file:///docs/readme.md');
    expect(chrome.tabs.query).toHaveBeenCalledWith(
      { active: true, currentWindow: true },
      expect.any(Function)
    );
    await expect(pending).resolves.toBeUndefined();
    expect(chrome.tabs.create).not.toHaveBeenCalled();
  });

  it('preserves rejection if its error handler itself fails', async () => {
    const failure = new Error('logging failed');
    vi.mocked(chrome.tabs.query).mockImplementation(() => {
      throw new Error('tabs unavailable');
    });
    vi.mocked(logger.error).mockImplementation(() => {
      throw failure;
    });
    const recent = new RecentTab(document.body);
    await expect(recent['openRecentDocument']('file:///docs/readme.md')).rejects.toBe(failure);
  });
});

describe('recent-document clicks without custom modifier bindings', () => {
  it.each([{}, { shiftKey: true }, { ctrlKey: true }, { metaKey: true }, { altKey: true }])(
    'opens in the active tab with modifiers %j',
    async modifiers => {
      const tab = { id: 7 } as chrome.tabs.Tab;
      vi.mocked(chrome.tabs.query).mockImplementation((_options, callback) => {
        callback?.([tab]);
        return Promise.resolve([tab]);
      });
      const recent = new RecentTab(document.body);
      const item = recent['createRecentFileItem']({
        url: 'file:///docs/readme.md',
        title: 'Readme',
        lastAccess: new Date().toISOString(),
        source: 'browser-rendered',
      });
      document.body.appendChild(item);
      const event = new MouseEvent('click', { bubbles: true, cancelable: true, ...modifiers });
      item.dispatchEvent(event);
      await Promise.resolve();

      expect(chrome.tabs.update).toHaveBeenCalledWith(
        7,
        { url: 'file:///docs/readme.md' },
        expect.any(Function)
      );
      expect(chrome.tabs.create).not.toHaveBeenCalled();
      expect(event.defaultPrevented).toBe(false);
    }
  );
});
