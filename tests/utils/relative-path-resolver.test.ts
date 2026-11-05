import { afterEach, describe, expect, it, vi } from 'vitest';
import { resolveImagesInHTML, resolveRelativePath } from '@utils/relative-path-resolver';

const originalUrl = window.location.href;
afterEach(() => {
  vi.restoreAllMocks();
  window.location.href = originalUrl;
});

describe('relative-path-resolver Promise contracts', () => {
  it('retains local file no-op Promise results', async () => {
    window.location.href = 'file:///docs/readme.md';
    const container = document.createElement('div');
    container.innerHTML = '<img src="image.png">';
    await expect(resolveRelativePath('image.png')).resolves.toBeNull();
    await expect(resolveImagesInHTML(container)).resolves.toBeUndefined();
    expect(container.querySelector('img')?.getAttribute('src')).toBe('image.png');
  });

  it('resolves remote images immediately while returning a Promise', async () => {
    window.location.href = 'https://example.test/docs/readme.md';
    const container = document.createElement('div');
    container.innerHTML =
      '<img src="../image.png"><img data-src="deferred.png"><img src="data:image/png;base64,abc">';
    const pending = resolveImagesInHTML(container);
    expect(pending).toBeInstanceOf(Promise);
    const images = container.querySelectorAll('img');
    expect(images[0]?.getAttribute('src')).toBe('https://example.test/image.png');
    expect(images[0]?.getAttribute('data-original-src')).toBe('../image.png');
    expect(images[1]?.getAttribute('data-src')).toBe('https://example.test/docs/deferred.png');
    expect(images[2]?.getAttribute('src')).toBe('data:image/png;base64,abc');
    await expect(pending).resolves.toBeUndefined();
  });

  it('turns synchronous DOM failures into rejected Promises', async () => {
    window.location.href = 'https://example.test/readme.md';
    const container = document.createElement('div');
    const failure = new Error('DOM unavailable');
    vi.spyOn(container, 'querySelectorAll').mockImplementation(() => {
      throw failure;
    });
    await expect(resolveImagesInHTML(container)).rejects.toBe(failure);
  });
});
