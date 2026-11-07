// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFile } from 'node:fs/promises';
vi.mock('@core/storage', async importOriginal => {
  const original = await importOriginal<typeof import('@core/storage')>();
  return { ...original, getSettings: vi.fn().mockResolvedValue(original.DEFAULT_SETTINGS) };
});
import { DEFAULT_SETTINGS, getSettings } from '@core/storage';
import { renderMarkdownContent } from '@core/document-renderer';
import { MarkdownRenderer } from '@core/markdown';
import { handleSettingsChange } from '@core/settings-manager';
import { createComponentInstances } from '@core/component-manager';
import { applyTheme, injectRenderedHTML } from '@utils/dom';
import { loadSyntaxTheme } from '@utils/syntax-theme-loader';
import { buildHtmlExport } from '@utils/html-export';

const theme = 'catppuccin-pitch-black';
const attribute = 'data-markview-document-theme';
async function selectTheme(value: string) {
  await handleSettingsChange(
    { documentTheme: value } as Parameters<typeof handleSettingsChange>[0],
    createComponentInstances(),
    { userClosed: false },
    vi.fn(),
    vi.fn()
  );
}
afterEach(async () => {
  vi.mocked(getSettings).mockResolvedValue(DEFAULT_SETTINGS);
  await loadSyntaxTheme('custom');
  vi.unstubAllGlobals();
  document.documentElement.className = '';
  document.documentElement.removeAttribute(attribute);
  document.head.innerHTML = '';
  document.body.innerHTML = '';
});

it('keeps existing installations on the default document theme', () => {
  expect(DEFAULT_SETTINGS).toMatchObject({ documentTheme: 'default' });
});

it('offers both document themes in the popup', async () => {
  document.body.innerHTML = await readFile('src/popup/index.html', 'utf8');
  const select = document.querySelector<HTMLSelectElement>('#documentTheme');
  expect(select).not.toBeNull();
  expect([...select!.options].map(option => option.value)).toEqual(['default', theme]);
});

it('applies the saved document theme during rendering and restores defaults on a later render', async () => {
  vi.mocked(getSettings).mockResolvedValue({ ...DEFAULT_SETTINGS, documentTheme: theme });
  await renderMarkdownContent(
    createComponentInstances(),
    { value: null },
    { url: '', title: '' },
    '# Saved',
    'saved.md',
    true
  );
  expect(document.documentElement.getAttribute(attribute)).toBe(theme);
  expect(document.querySelector('#markview-container h1')?.textContent).toBe('Saved');
  vi.mocked(getSettings).mockResolvedValue(DEFAULT_SETTINGS);
  await renderMarkdownContent(
    createComponentInstances(),
    { value: null },
    { url: '', title: '' },
    '# Default',
    'default.md',
    true
  );
  expect(document.documentElement.hasAttribute(attribute)).toBe(false);
  expect(document.querySelector('#markview-container h1')?.textContent).toBe('Default');
});

describe.each(['light', 'dark'] as const)('document theme with %s interface', mode => {
  it('styles real Markdown, switches live, and exports the selected theme', async () => {
    applyTheme(mode);
    const renderer = new MarkdownRenderer();
    const content = [
      '# One',
      '## Two',
      '### Three',
      '#### Four',
      '##### Five',
      '###### Six',
      'Body **strong** *emphasis* ~~deleted~~ [link](https://example.com) and `inline`.',
      '> Quote',
      '```',
      'plain code',
      '```',
      '```js',
      'const number = 42;',
      '```',
    ].join('\n\n');
    injectRenderedHTML(renderer.render(content));
    document.body.insertAdjacentHTML('beforeend', '<button id="interface">Control</button>');
    await selectTheme(theme);
    expect(document.documentElement.getAttribute(attribute)).toBe(theme);
    const imports = [
      ...(await readFile('src/main.ts', 'utf8')).matchAll(/import '\.\/(styles\/[^']+\.css)'/g),
    ];
    const css = (await Promise.all(imports.map(match => readFile(`src/${match[1]}`, 'utf8')))).join(
      '\n'
    );
    const sheet = document.createElement('style');
    sheet.textContent = css;
    document.head.append(sheet);
    const style = (selector: string) => getComputedStyle(document.querySelector(selector)!);
    expect(style('#markview-container').backgroundColor).toBe('rgb(0, 0, 0)');
    expect(style('#markview-container').color).toBe('rgb(205, 214, 244)');
    expect(style('h1').color).toBe('rgb(137, 180, 250)');
    expect(style('h1').textDecorationLine).toBe('underline');
    expect(style('h2').fontWeight).toBe('700');
    expect(style('h3').color).toBe('rgb(116, 199, 236)');
    expect(style('h4').fontWeight).toBe('400');
    expect(style('h5').color).toBe('rgb(255, 255, 255)');
    expect(style('h6').fontWeight).toBe('400');
    expect(style('strong').color).toBe('rgb(243, 139, 168)');
    expect(style('em').color).toBe('rgb(245, 224, 220)');
    expect(style('s').color).toBe('rgb(205, 214, 244)');
    expect(style('blockquote').color).toBe('rgb(245, 194, 231)');
    expect(style('p a').color).toBe('rgb(137, 220, 235)');
    expect(style('p a').fontStyle).toBe('italic');
    expect(style('p a').textDecorationLine).toBe('underline');
    expect(style('p code').color).toBe('rgb(62, 193, 255)');
    expect(style('p code').backgroundColor).toBe('rgb(49, 50, 68)');
    expect(style('pre code').backgroundColor).toBe('rgb(49, 50, 68)');
    expect(style('#interface').color).not.toBe('rgb(205, 214, 244)');
    const source = document.getElementById('markview-container')!;
    const exported = new DOMParser().parseFromString(
      buildHtmlExport(source, 'Theme', mode === 'dark', css),
      'text/html'
    );
    expect(exported.documentElement.getAttribute(attribute)).toBe(theme);
    expect(exported.documentElement.classList.contains(`markview-${mode}`)).toBe(true);
    expect(exported.querySelector('style')?.textContent).toContain('#3ec1ff');
    const frame = document.createElement('iframe');
    document.body.append(frame);
    frame.contentDocument!.open();
    frame.contentDocument!.write(exported.documentElement.outerHTML);
    frame.contentDocument!.close();
    expect(
      frame.contentWindow!.getComputedStyle(frame.contentDocument!.querySelector('h1')!).color
    ).toBe('rgb(137, 180, 250)');
    expect(
      frame.contentWindow!.getComputedStyle(
        frame.contentDocument!.getElementById('markview-container')!
      ).backgroundColor
    ).toBe('rgb(0, 0, 0)');
    frame.remove();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(await readFile(`src/styles/themes/${theme}.css`, 'utf8')))
    );
    await loadSyntaxTheme(theme);
    expect(style('pre code').backgroundColor).toBe('rgb(0, 0, 0)');
    expect(style('h1').color).toBe('rgb(137, 180, 250)');
    await handleSettingsChange(
      { theme: mode === 'dark' ? 'light' : 'dark' },
      createComponentInstances(),
      { userClosed: false },
      vi.fn(),
      vi.fn()
    );
    expect(style('h1').color).toBe('rgb(137, 180, 250)');
    await selectTheme('default');
    expect(document.documentElement.hasAttribute(attribute)).toBe(false);
    expect(style('#markview-container').backgroundColor).not.toBe('rgb(0, 0, 0)');
    expect(style('pre code').backgroundColor).toBe('rgb(0, 0, 0)');
    await selectTheme('unrecognized');
    expect(document.documentElement.hasAttribute(attribute)).toBe(false);
  });
});
