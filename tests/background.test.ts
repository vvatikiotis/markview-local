import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@utils/logger', () => ({ logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

describe('background message dispatch', () => {
  let listener: (message: any, sender: any, sendResponse: (value?: any) => void) => boolean;

  afterEach(() => {
    vi.restoreAllMocks();
  });

  beforeEach(async () => {
    vi.resetModules();
    vi.mocked(chrome.runtime.onMessage.addListener).mockImplementation(callback => {
      listener = callback as typeof listener;
    });
    await import('../src/background');
  });

  it('rejects obsolete fetchImage messages without fetching', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('unexpected fetch'));
    const sendResponse = vi.fn();

    const asynchronous = listener({ action: 'fetchImage', url: 'https://example.test/image' }, {}, sendResponse);

    expect(asynchronous).toBe(false);
    expect(sendResponse).toHaveBeenCalledWith({ error: 'Unknown action' });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('retains fetch dispatch for local-file auto-refresh', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      url: 'file:///tmp/file.md',
      type: 'basic',
      status: 200,
      text: async () => '# markdown',
    } as Response);
    const sendResponse = vi.fn();

    expect(listener({ action: 'fetch', url: 'file:///tmp/file.md' }, {}, sendResponse)).toBe(true);
    await vi.waitFor(() => expect(sendResponse).toHaveBeenCalledWith({
      success: true,
      content: '# markdown',
      url: 'file:///tmp/file.md',
    }));
    expect(fetchSpy).toHaveBeenCalledOnce();
  });

  it.each(['https://example.test/file.md', 'http://example.test/file.md', 'data:text/plain,x', 'not a URL'])(
    'rejects non-file fetch URL %s without fetching', async url => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('unexpected fetch'));
      const sendResponse = vi.fn();

      listener({ action: 'fetch', url }, {}, sendResponse);
      await vi.waitFor(() => expect(sendResponse).toHaveBeenCalled());
      expect(sendResponse).toHaveBeenCalledWith({ error: expect.any(String) });
      expect(fetchSpy).not.toHaveBeenCalled();
    }
  );

  it('denies redirects without returning their content', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 0,
      type: 'opaqueredirect',
      url: 'file:///tmp/file.md',
    } as Response);
    const sendResponse = vi.fn();

    listener({ action: 'fetch', url: 'file:///tmp/file.md' }, {}, sendResponse);
    await vi.waitFor(() => expect(sendResponse).toHaveBeenCalledWith({
      error: 'Redirects are not supported for local documents',
    }));
    expect(fetchSpy).toHaveBeenCalledWith('file:///tmp/file.md', expect.objectContaining({ redirect: 'manual' }));
  });
});
