// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFile } from 'node:fs/promises';
import { MarkdownRenderer } from '@core/markdown';
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

  it.each([false, true])('themes actual Markdown code blocks in dark mode = %s', async dark => {
    const base = document.createElement('style');
    base.textContent =
      (await readFile('src/styles/main.css', 'utf8')) +
      (await readFile('src/styles/syntax-highlighting.css', 'utf8'));
    document.head.append(base);
    document.documentElement.classList.add('markview-active');
    document.documentElement.classList.toggle('markview-dark', dark);
    const renderer = new MarkdownRenderer();
    const markdown = [
      '```js',
      '// comment',
      'const answer = 42;',
      '```',
      '',
      '```unknown-language',
      '<plain> & text',
      '```',
      '',
      '```',
      '<plain> & text',
      '```',
      '',
      '    <indented> & text',
      '',
      '```mermaid',
      'graph TD; A-->B;',
      '```',
      '',
      'Prose with `inline code`.',
    ].join('\n');
    document.body.innerHTML = `<div id="markview-container">${renderer.render(markdown)}</div>`;
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(await readFile(`src/styles/themes/${id}.css`, 'utf8')))
    );
    await loadSyntaxTheme(id);
    const blocks = [...document.querySelectorAll('pre code')];
    expect(blocks).toHaveLength(4);
    for (const block of blocks) {
      expect(getComputedStyle(block).backgroundColor).toBe('rgba(0, 0, 0, 0)');
      expect(getComputedStyle(block).color).toBe('rgb(205, 214, 244)');
    }
    expect(blocks[0]!.classList.contains('language-js')).toBe(true);
    expect(blocks[0]!.querySelector('.hljs-keyword')?.textContent).toBe('const');
    expect(blocks[1]!.textContent).toBe('<plain> & text\n');
    expect(blocks[2]!.textContent).toBe('<plain> & text\n');
    expect(blocks[3]!.textContent).toBe('<indented> & text\n');
    expect(document.querySelector('.mermaid-placeholder')).not.toBeNull();
    expect(document.querySelector('p code')!.classList.contains('hljs')).toBe(false);
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
      expect(style('code').backgroundColor).toBe('rgba(0, 0, 0, 0)');
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
