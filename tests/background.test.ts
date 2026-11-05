import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@utils/logger', () => ({ logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

describe('background message dispatch', () => {
  let listener: (
    message: unknown,
    sender: chrome.runtime.MessageSender,
    sendResponse: (value?: unknown) => void
  ) => unknown;

  afterEach(() => {
    vi.restoreAllMocks();
  });

  beforeEach(async () => {
    vi.resetModules();
    vi.mocked(chrome.runtime.onMessage.addListener).mockImplementation(callback => {
      listener = callback;
    });
    await import('../src/background');
  });

  it.each([null, undefined, true, 123, 'fetch', [], {}, { action: null }])(
    'rejects malformed message %j without invoking privileged APIs',
    message => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch');
      chrome.tabs.create = vi.fn();
      const sendResponse = vi.fn();
      expect(listener(message, {}, sendResponse)).toBe(false);
      expect(sendResponse).toHaveBeenCalledWith({ error: expect.any(String) });
      expect(fetchSpy).not.toHaveBeenCalled();
      expect(chrome.tabs.create).not.toHaveBeenCalled();
    }
  );

  it.each([null, 123, false, [], { toString: () => 'file:///tmp/file.md' }])(
    'rejects malformed fetch URL %j instead of coercing it or falling back to sender',
    url => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch');
      const sendResponse = vi.fn();
      expect(
        listener({ action: 'fetch', url }, { url: 'file:///tmp/fallback.md' }, sendResponse)
      ).toBe(false);
      expect(sendResponse).toHaveBeenCalledWith({ error: 'Invalid URL' });
      expect(fetchSpy).not.toHaveBeenCalled();
    }
  );

  it('retains sender URL fallback for fetch without a URL', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('# fallback'));
    const sendResponse = vi.fn();
    expect(listener({ action: 'fetch' }, { url: 'file:///tmp/fallback.md' }, sendResponse)).toBe(
      true
    );
    await vi.waitFor(() =>
      expect(sendResponse).toHaveBeenCalledWith({
        success: true,
        content: '# fallback',
        url: 'file:///tmp/fallback.md',
      })
    );
    expect(fetchSpy).toHaveBeenCalledWith('file:///tmp/fallback.md', expect.any(Object));
  });

  it.each([{}, { url: null }, { url: 123 }, { url: {} }])(
    'rejects malformed openTab payload %j',
    payload => {
      chrome.tabs.create = vi.fn();
      const sendResponse = vi.fn();
      expect(listener({ action: 'openTab', ...payload }, {}, sendResponse)).toBe(false);
      expect(sendResponse).toHaveBeenCalledWith({ error: 'Missing required URL parameter' });
      expect(chrome.tabs.create).not.toHaveBeenCalled();
    }
  );

  it('retains openTab callback responses and the asynchronous channel', () => {
    chrome.tabs.create = vi.fn().mockImplementation((_options, callback) => callback({ id: 7 }));
    const sendResponse = vi.fn();
    expect(listener({ action: 'openTab', url: 'https://example.test' }, {}, sendResponse)).toBe(
      true
    );
    expect(sendResponse).toHaveBeenCalledWith({
      success: true,
      tabId: 7,
      url: 'https://example.test',
    });
  });

  it('catches synchronous tab API errors and responds with failure', () => {
    chrome.tabs.create = vi.fn().mockImplementation(() => {
      throw new Error('tab failed');
    });
    const sendResponse = vi.fn();
    expect(listener({ action: 'openTab', url: 'https://example.test' }, {}, sendResponse)).toBe(
      true
    );
    expect(sendResponse).toHaveBeenCalledWith({ success: false, error: 'Error: tab failed' });
  });

  it('rejects obsolete fetchImage messages without fetching', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('unexpected fetch'));
    const sendResponse = vi.fn();

    const asynchronous = listener(
      { action: 'fetchImage', url: 'https://example.test/image' },
      {},
      sendResponse
    );

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
    await vi.waitFor(() =>
      expect(sendResponse).toHaveBeenCalledWith({
        success: true,
        content: '# markdown',
        url: 'file:///tmp/file.md',
      })
    );
    expect(fetchSpy).toHaveBeenCalledOnce();
  });

  it.each([
    'https://example.test/file.md',
    'http://example.test/file.md',
    'data:text/plain,x',
    'not a URL',
  ])('rejects non-file fetch URL %s without fetching', async url => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('unexpected fetch'));
    const sendResponse = vi.fn();

    listener({ action: 'fetch', url }, {}, sendResponse);
    await vi.waitFor(() => expect(sendResponse).toHaveBeenCalled());
    expect(sendResponse).toHaveBeenCalledWith({ error: expect.any(String) });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('denies redirects without returning their content', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 0,
      type: 'opaqueredirect',
      url: 'file:///tmp/file.md',
    } as Response);
    const sendResponse = vi.fn();

    listener({ action: 'fetch', url: 'file:///tmp/file.md' }, {}, sendResponse);
    await vi.waitFor(() =>
      expect(sendResponse).toHaveBeenCalledWith({
        error: 'Redirects are not supported for local documents',
      })
    );
    expect(fetchSpy).toHaveBeenCalledWith(
      'file:///tmp/file.md',
      expect.objectContaining({ redirect: 'manual' })
    );
  });
});
