import { afterEach, describe, expect, it, vi } from 'vitest';
import { getHighlightJS, highlightCode, loadLanguage } from '@utils/highlight-loader';

afterEach(() => vi.restoreAllMocks());

describe('highlight-loader Promise contracts', () => {
  it('checks supported and unsupported languages immediately and returns Promises', async () => {
    const lookup = vi.spyOn(getHighlightJS(), 'getLanguage');
    const supported = loadLanguage('js');
    expect(supported).toBeInstanceOf(Promise);
    expect(lookup).toHaveBeenCalledWith('javascript');
    await expect(supported).resolves.toBe(true);
    await expect(loadLanguage('not-a-language')).resolves.toBe(false);
  });

  it('highlights immediately and returns escaped Mermaid / unsupported code through Promises', async () => {
    const highlight = vi.spyOn(getHighlightJS(), 'highlight');
    const result = highlightCode('const x = 1;', 'js');
    expect(result).toBeInstanceOf(Promise);
    expect(highlight).toHaveBeenCalled();
    await expect(result).resolves.toContain('hljs-keyword');
    await expect(highlightCode('<script>&', 'mermaid')).resolves.toBe('&lt;script&gt;&amp;');
    await expect(highlightCode('<b>', 'not-a-language')).resolves.toBe('&lt;b&gt;');
  });

  it('rejects lookup failures rather than throwing synchronously', async () => {
    const failure = new Error('lookup failed');
    vi.spyOn(getHighlightJS(), 'getLanguage').mockImplementation(() => {
      throw failure;
    });
    await expect(loadLanguage('js')).rejects.toBe(failure);
    await expect(highlightCode('x', 'js')).rejects.toBe(failure);
  });

  it('retains escaped fallback when highlighting itself fails', async () => {
    vi.spyOn(getHighlightJS(), 'highlight').mockImplementation(() => {
      throw new Error('highlight failed');
    });
    await expect(highlightCode('<b>', 'js')).resolves.toBe('&lt;b&gt;');
  });
});
