// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFile } from 'node:fs/promises';
import { getThemeById, loadSyntaxTheme, getCurrentTheme } from '@utils/syntax-theme-loader';

const id = 'catppuccin-pitch-black';
afterEach(async () => {
  await loadSyntaxTheme('custom');
  vi.unstubAllGlobals();
  document.head.innerHTML = '';
  document.body.innerHTML = '';
  document.documentElement.className = '';
});

describe('Catppuccin Pitch Black', () => {
  it('is available in the theme registry and popup selector', async () => {
    expect(getThemeById(id)).toMatchObject({ name: 'Catppuccin Pitch Black', type: 'dark' });
    document.body.innerHTML = await readFile('src/popup/index.html', 'utf8');
    const option = document.querySelector<HTMLOptionElement>(`#syntaxTheme option[value="${id}"]`);
    expect(option?.textContent).toBe('Catppuccin Pitch Black');
    expect(option?.disabled).toBe(false);
  });

  it.each([false, true])(
    'applies the palette with dark app mode = %s and restores the default',
    async dark => {
      const base = document.createElement('style');
      base.textContent = await readFile('src/styles/syntax-highlighting.css', 'utf8');
      document.head.append(base);
      document.documentElement.classList.toggle('markview-dark', dark);
      document.body.innerHTML = `<div id="markview-container"><pre><code class="hljs"><span class="hljs-comment">comment</span><span class="hljs-number">42</span><span class="hljs-literal">true</span><span class="hljs-title function_">fn</span><span class="hljs-params">arg</span><span class="hljs-operator">+</span><span class="hljs-string">str</span></code></pre></div><span class="hljs-comment" id="host">host</span>`;
      vi.stubGlobal(
        'fetch',
        vi.fn(async (url: string) => {
          expect(url).toBe(chrome.runtime.getURL(`css/${id}.css`));
          return new Response(await readFile(`src/styles/themes/${id}.css`, 'utf8'));
        })
      );
      await loadSyntaxTheme(id);
      expect(getCurrentTheme()).toBe(id);
      const style = (selector: string) => getComputedStyle(document.querySelector(selector)!);
      expect(style('code').backgroundColor).toBe('rgb(0, 0, 0)');
      expect(style('code').color).toBe('rgb(205, 214, 244)');
      expect(style('code .hljs-comment').color).toBe('rgb(147, 153, 178)');
      expect(style('code .hljs-comment').fontStyle).toBe('italic');
      expect(style('.hljs-number').color).toBe('rgb(205, 214, 244)');
      expect(style('.hljs-literal').fontWeight).toBe('700');
      expect(style('.function_').color).toBe('rgb(137, 180, 250)');
      expect(style('.function_').fontWeight).toBe('700');
      expect(style('.hljs-params').color).toBe('rgb(250, 179, 135)');
      expect(style('.hljs-params').fontStyle).toBe('italic');
      expect(style('.hljs-operator').color).toBe('rgb(249, 226, 175)');
      expect(style('.hljs-string').color).toBe('rgb(166, 227, 161)');
      expect(style('#host').color).not.toBe('rgb(147, 153, 178)');
      await loadSyntaxTheme('custom');
      expect(document.getElementById('markview-syntax-theme')).toBeNull();
      expect(document.documentElement.classList.contains('markview-external-syntax-theme')).toBe(
        false
      );
    }
  );
});
