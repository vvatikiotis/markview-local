// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@utils/content-detection', () => ({
  detectMarkdownSource: vi.fn(() => 'local-file-system'),
  isMarkdownContentType: vi.fn(() => true),
}));

import { validateMarkdownPage } from '@utils/validation';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('validateMarkdownPage', () => {
  it.each(['http:', 'https:', 'chrome-extension:', 'data:', 'about:'])('rejects %s documents', protocol => {
    vi.stubGlobal('window', { location: new URL(`${protocol}//example.test/document.md`) });
    expect(validateMarkdownPage()).toBeNull();
  });

  it.each([
    'file:///tmp/document.md',
    'file:///tmp/document.mdx?version=1#section',
    'file:///tmp/DOCUMENT.MARKDOWN#section?ignored',
  ])('accepts local markdown URL %s', url => {
    vi.stubGlobal('window', { location: new URL(url) });
    expect(validateMarkdownPage()).toBe('local-file-system');
  });

  it('rejects local URLs without a supported markdown extension', () => {
    vi.stubGlobal('window', { location: new URL('file:///tmp/document.txt?download=1#part') });
    expect(validateMarkdownPage()).toBeNull();
  });
});
