// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFile } from 'node:fs/promises';
import katex from 'katex';
import mermaid from 'mermaid';
vi.mock('@utils/sandbox-detection', () => ({ isSandboxed: vi.fn().mockReturnValue(false) }));
vi.mock('@utils/notification', () => ({ showNotification: vi.fn() }));
import {
  buildHtmlExport,
  portableStylesheet,
  exportRenderedHtml,
  htmlExportFilename,
  collectExtensionStyles,
} from '@utils/html-export';
import { isSandboxed } from '@utils/sandbox-detection';
import { loadSyntaxTheme } from '@utils/syntax-theme-loader';

describe('buildHtmlExport', () => {
  it('exports sanitized content, promotes empty-src lazy images, and leaves the live DOM unchanged', () => {
    const source = document.createElement('div');
    source.innerHTML =
      '<h1>Title</h1><img src="" data-src="../pic.png" loading="lazy" class="lazy-loading"><button>copy</button><script>alert(1)</script><iframe srcdoc="<script>x</script>"></iframe><svg onload="alert(1)"><circle/></svg><a href="javascript:alert(1)">bad</a><span onclick="x()" style="background:url(https://evil.test/x)">text</span>';
    const before = source.innerHTML;
    const html = buildHtmlExport(
      source,
      'a <test> & x',
      true,
      '.hljs-keyword{color:red}.katex{font-family:KaTeX_Main}'
    );
    expect(html).toContain('src="http://localhost:3000/pic.png"');
    expect(html).not.toContain('data-src');
    expect(html).not.toContain('loading=');
    expect(html).not.toContain('lazy-loading');
    expect(html).not.toContain('<button');
    expect(html).not.toContain('<script');
    expect(html).not.toContain('<iframe');
    expect(html).not.toContain('onload');
    expect(html).not.toContain('onclick');
    expect(html).not.toContain('javascript:');
    expect(html).not.toContain('evil.test');
    expect(html).toContain('markview-active');
    expect(html).toContain('markview-dark');
    expect(html).toContain('id="markview-container"');
    expect(html).toContain('.hljs-keyword');
    expect(html).toContain('.katex');
    expect(html).not.toContain('<base href=');
    expect(source.innerHTML).toBe(before);
  });

  it('escapes title, retains file resources and same-document fragments, and preserves SVG/KaTeX layout', () => {
    const source = document.createElement('div');
    source.innerHTML =
      '<a href="#section">jump</a><a href="file:///Users/user/guide.md">file</a><img src="file:///Users/user/image.png"><span class="katex"><span class="mfrac" style="height:2em;vertical-align:-.5em"><span style="top:-1em">x</span></span></span><math><mi>x</mi></math>';
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 10 10');
    const svgStyle = document.createElementNS('http://www.w3.org/2000/svg', 'style');
    svgStyle.textContent = '.node{fill:#fff;stroke:#000}';
    svg.append(svgStyle);
    const label = document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject');
    label.setAttribute('x', '1');
    label.setAttribute('y', '2');
    const labelHtml = document.createElementNS('http://www.w3.org/1999/xhtml', 'div');
    labelHtml.setAttribute('onclick', 'evil()');
    labelHtml.innerHTML = 'safe label<script>evil()</script>';
    label.append(labelHtml);
    svg.append(label);
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('class', 'node');
    path.setAttribute('d', 'M0 0L1 1');
    svg.append(path);
    source.append(svg);
    const html = buildHtmlExport(source, '</title><script>alert(1)</script>', false);
    expect(html).not.toContain('</title><script');
    expect(html).toContain('&lt;/title&gt;');
    expect(html).toContain('href="#section"');
    expect(html).toContain('src="file:///Users/user/image.png"');
    expect(html).toContain('href="file:///Users/user/guide.md"');
    expect(parse(html).querySelector('.node')?.getAttribute('style')).toMatch(
      /fill:(?:#fff|rgb\(255, 255, 255\))/
    );
    expect(html).not.toContain('foreignObject');
    expect(html).toContain('safe label');
    expect(html).not.toContain('evil()');
    expect(html).toContain('class="node"');
    expect(html).toContain('height:2em');
    expect(html).toContain('vertical-align:-.5em');
    expect(html).not.toContain('onclick');
    expect(html).not.toContain('<script');
    expect(html).toContain('<math');
  });
});

function parse(html: string): Document {
  return new DOMParser().parseFromString(html, 'text/html');
}

beforeEach(() => {
  if (!CSSStyleSheet.prototype.replaceSync) {
    CSSStyleSheet.prototype.replaceSync = function (css: string) {
      const style = document.createElement('style');
      style.textContent = css;
      document.head.append(style);
      for (const rule of [...(style.sheet?.cssRules ?? [])])
        this.insertRule(rule.cssText, this.cssRules.length);
      style.remove();
    };
  }
  URL.createObjectURL = vi.fn();
  URL.revokeObjectURL = vi.fn();
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string) => {
      const path = new URL(input).pathname.slice(1);
      const main = await readFile('src/main.ts', 'utf8');
      const bytes =
        path === 'css/content.css'
          ? Buffer.from(
              (
                await Promise.all(
                  [...main.matchAll(/import '\.\/(styles\/[^']+\.css)'/g)].map(match =>
                    readFile(`src/${match[1]}`, 'utf8')
                  )
                )
              ).join('\n')
            )
          : await readFile(path);
      return new Response(bytes, { status: 200 });
    })
  );
});
afterEach(() => vi.unstubAllGlobals());

describe('portable resources', () => {
  it('embeds real WOFF2 bytes including KaTeX AMS private-use glyphs with no system-font dependency', async () => {
    const css = await readFile('node_modules/katex/dist/katex.min.css', 'utf8');
    const portable = await portableStylesheet(
      css,
      chrome.runtime.getURL('node_modules/katex/dist/katex.min.css')
    );
    const source = document.createElement('div');
    source.innerHTML = katex.renderToString(String.raw`\nleqslant + \frac{1}{x}`);
    const html = buildHtmlExport(source, 'Math', false, portable);
    expect(parse(html).body.textContent).toContain('\uE010');
    expect(html).toContain('font-family:KaTeX_AMS');
    expect(html).not.toMatch(/(?:chrome|moz)-extension:|url\(fonts\/|local\(/);
    const ams = portable.match(
      /font-family:KaTeX_AMS;[^}]*src:url\("data:font\/woff2;base64,([^"()]+)"\)/
    );
    expect(ams).not.toBeNull();
    expect(Buffer.from(ams![1]!, 'base64')).toEqual(
      await readFile('node_modules/katex/dist/fonts/KaTeX_AMS-Regular.woff2')
    );
    expect(
      vi
        .mocked(fetch)
        .mock.calls.every(([url]) =>
          String(url).startsWith(chrome.runtime.getURL('node_modules/katex/dist/fonts/KaTeX_'))
        )
    ).toBe(true);
  });

  it('captures packaged manifest CSS even with inaccessible CSSOM, excludes host CSS and fails closed on missing assets', async () => {
    const spy = vi.spyOn(document, 'styleSheets', 'get').mockImplementation(() => {
      throw new Error('CSSOM blocked');
    });
    const css = await collectExtensionStyles();
    expect(css).toContain('#markview-container');
    expect(css).toContain('--');
    expect(css).toContain('.hljs-keyword');
    expect(css).toContain('.mermaid-container');
    const manifest = JSON.parse(await readFile('src/manifest.json', 'utf8'));
    expect(manifest.content_scripts[0].css).toEqual(['css/content.css']);
    expect(await readFile('build/webpack.common.cjs', 'utf8')).toContain(
      "filename: 'css/[name].css'"
    );
    expect(css).toContain('data:font/woff2;base64,');
    expect(fetch).toHaveBeenCalledWith(chrome.runtime.getURL('css/content.css'));
    spy.mockRestore();
    vi.mocked(fetch).mockResolvedValue(new Response('', { status: 404 }));
    await expect(collectExtensionStyles()).rejects.toThrow('asset unavailable');
  });

  it('refetches only the selected packaged syntax theme, ignoring host style elements', async () => {
    await loadSyntaxTheme('github-dark');
    document.getElementById('markview-syntax-theme')!.textContent = '.forged{color:red}';
    const css = await collectExtensionStyles();
    expect(css).not.toContain('.forged');
    expect(css).toContain('.markview-external-syntax-theme #markview-container');
    expect(fetch).toHaveBeenCalledWith(
      chrome.runtime.getURL('node_modules/highlight.js/styles/github-dark.css')
    );
    await loadSyntaxTheme('custom');
  });

  it('refuses invalid bundled font bytes rather than emitting a false WOFF2 MIME type', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('not a font'));
    await expect(
      portableStylesheet(
        '@font-face{src:url(fonts/KaTeX_AMS-Regular.woff2)}',
        chrome.runtime.getURL('node_modules/katex/dist/katex.min.css')
      )
    ).rejects.toThrow('Invalid bundled WOFF2');
  });

  it('never fetches document-supplied stylesheet resource URLs', async () => {
    const css = await portableStylesheet(
      '@font-face{src:url(https://evil.test/a.woff2)}.x{background:url(../bad.png)}',
      chrome.runtime.getURL('css/content.css')
    );
    expect(fetch).not.toHaveBeenCalled();
    expect(css).not.toContain('evil.test');
    expect(css).not.toContain('bad.png');
  });
});

describe('parsed export security and references', () => {
  it('retains literal fragment metacharacters without post-sanitize replacement expansion', () => {
    const source = document.createElement('div');
    source.innerHTML = '<span title="foo onmouseover=alert(1)//">prefix</span><a href="#$`">go</a>';
    const fragments = [
      '#$&',
      "#$'",
      '#$$',
      '#$1',
      '#$0',
      '#$12',
      '#$99',
      '#$<name>',
      '#%22%3E%3Cscript%3E',
      '#a" onmouseover="evil()',
      '#a&b',
    ];
    for (const fragment of fragments) {
      const anchor = document.createElement('a');
      anchor.setAttribute('href', fragment);
      anchor.textContent = fragment;
      source.append(anchor);
    }
    const result = parse(buildHtmlExport(source, 'Security', false));
    expect([...result.querySelectorAll('a')].map(node => node.getAttribute('href'))).toEqual([
      '#$`',
      ...fragments,
    ]);
    expect(result.querySelector('script, [onmouseover]')).toBeNull();
  });

  it('serializes quoted/encoded URLs and SVG fragment links without changing the saved base', () => {
    const source = document.createElement('div');
    window.history.replaceState(null, '', '/docs/guide.md');
    try {
      source.setAttribute('style', 'font-family:"Example Font";width:80%');
      const anchor = document.createElement('a');
      anchor.href = '../assets/a%22b.png?q="quoted"&next=%23fragment';
      anchor.textContent = 'encoded resource';
      source.append(anchor);
      source.insertAdjacentHTML(
        'beforeend',
        '<a href="http://localhost:3000/docs/guide.md#inside">local</a><svg><use href="#%22$`&amp;"/><use href="http://localhost:3000/docs/guide.md#shape"/></svg>'
      );
      const result = parse(buildHtmlExport(source, 'Moved', false));
      expect(result.querySelector('a')?.getAttribute('href')).toBe(
        'http://localhost:3000/assets/a%22b.png?q=%22quoted%22&next=%23fragment'
      );
      expect(result.querySelectorAll('a')[1]?.getAttribute('href')).toBe('#inside');
      expect([...result.querySelectorAll('use')].map(node => node.getAttribute('href'))).toEqual([
        '#%22$`&',
        '#shape',
      ]);
      expect(result.querySelector('main')?.getAttribute('style')).toContain(
        'font-family:"Example Font"'
      );
      expect(result.querySelector('base,[onmouseover]')).toBeNull();
    } finally {
      window.history.replaceState(null, '', '/');
    }
  });

  it('resolves moved img/picture/source/srcset and deferred candidates while retaining descriptors and data commas', () => {
    const source = document.createElement('div');
    source.innerHTML =
      '<picture><source srcset="../wide%20a.png 800w, /big.png 1600w"><img src="small.png" srcset="large.png 2x, data:image/png;base64,aGVsbG8= 1x, data:image/svg+xml,%3Csvg%3E,%3C/svg%3E 5x, javascript:evil() 3x, #local 4x, /bad.png nope"></picture><img data-src="lazy.png" data-srcset="lazy2.png 2x">';
    const result = parse(buildHtmlExport(source, 'Images', false));
    expect(result.querySelector('source')?.getAttribute('srcset')).toBe(
      'http://localhost:3000/wide%20a.png 800w, http://localhost:3000/big.png 1600w'
    );
    expect(result.querySelector('img')?.getAttribute('srcset')).toBe(
      'http://localhost:3000/large.png 2x, data:image/png;base64,aGVsbG8= 1x, data:image/svg+xml,%3Csvg%3E,%3C/svg%3E 5x, #local 4x'
    );
    expect(result.querySelectorAll('img')[1]?.getAttribute('srcset')).toBe(
      'http://localhost:3000/lazy2.png 2x'
    );
    expect(result.querySelectorAll('img')[1]?.getAttribute('src')).toBe(
      'http://localhost:3000/lazy.png'
    );
    expect(result.body.innerHTML).not.toMatch(/javascript:|data-src|nope/);
  });

  it('keeps SVG local fragment references but removes active/resource CSS rules individually', () => {
    const source = document.createElement('div');
    source.innerHTML =
      '<svg><style>@import url(https://evil.test/import);@keyframes dash{to{stroke-dashoffset:0}}.safe{fill:red;stroke:blue;marker-end:url(#arrow)}.unsafe{fill:url(https://evil.test/fill);stroke:green}</style><defs><marker id="arrow"><path d="M0 0L1 1"/></marker></defs><path class="safe"/><path class="unsafe" fill="url(https://evil.test/presentation)"/><use href="#arrow"/><use href="javascript:evil()"/></svg>';
    const result = parse(buildHtmlExport(source, 'SVG', false));
    expect(result.querySelector('.safe')?.getAttribute('style')).toContain('fill:red');
    expect(result.querySelector('.safe')?.getAttribute('style')).toMatch(/url\(["']?#arrow["']?\)/);
    expect(result.querySelector('.unsafe')?.getAttribute('style')).toContain('stroke:green');
    expect(result.querySelector('use')?.getAttribute('href')).toBe('#arrow');
    expect(result.body.innerHTML).not.toMatch(/evil|@import|@keyframes/);
  });

  it('preserves static styles, arrows and readable labels from installed Mermaid output', async () => {
    Object.defineProperty(SVGElement.prototype, 'getBBox', {
      configurable: true,
      value: () => ({ x: 0, y: 0, width: 120, height: 30 }),
    });
    Object.defineProperty(SVGElement.prototype, 'getComputedTextLength', {
      configurable: true,
      value: () => 120,
    });
    mermaid.initialize({ startOnLoad: false, securityLevel: 'strict' });
    const { svg } = await mermaid.render(
      'real-export-diagram',
      'graph TD; A[Readable label] --> B[Destination]'
    );
    expect(svg).toContain('@keyframes');
    const source = document.createElement('div');
    source.innerHTML = svg;
    const before = source.innerHTML;
    const result = parse(buildHtmlExport(source, 'Mermaid', false));
    expect(result.querySelector('.node rect')?.getAttribute('style')).toMatch(/fill:/);
    expect(result.querySelector('.flowchart-link')?.getAttribute('style')).toMatch(/stroke:/);
    expect(result.querySelector('[marker-end]')?.getAttribute('marker-end')).toContain('#');
    expect(result.querySelector('marker path[d]')).not.toBeNull();
    expect(result.querySelector('.flowchart-link[d]')).not.toBeNull();
    expect(result.body.textContent).toContain('Readable label');
    expect(result.body.querySelector('foreignObject,script,style,[onclick]')).toBeNull();
    expect(result.body.innerHTML).not.toMatch(/(?:chrome|moz)-extension:/);
    expect(source.innerHTML).toBe(before);
  });
});

describe('exportRenderedHtml', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
    vi.mocked(isSandboxed).mockReturnValue(false);
  });

  it('downloads rendered content and always releases temporary URL and anchor', async () => {
    document.body.innerHTML = '<main id="markview-container"><p>Rendered</p></main>';
    document.title = 'Guide';
    const create = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:export');
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement
    ) {
      expect(this.download).toBe('Guide.html');
      expect(this.href).toBe('blob:export');
    });
    await exportRenderedHtml();
    expect(create).toHaveBeenCalledOnce();
    expect(click).toHaveBeenCalledOnce();
    expect(revoke).toHaveBeenCalledWith('blob:export');
    expect(document.querySelector('a[download]')).toBeNull();
  });

  it('allows image-only documents and refuses raw, unfinished, or sandboxed content', async () => {
    document.body.innerHTML = '<main id="markview-container"><img data-src="pic.png"></main>';
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:export');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    await expect(exportRenderedHtml()).resolves.toBeUndefined();
    document.body.innerHTML =
      '<main id="markview-container"><pre class="markview-raw-view">raw</pre></main>';
    await expect(exportRenderedHtml()).rejects.toThrow('Rendered content is unavailable');
    document.body.innerHTML =
      '<main id="markview-container"><div class="mermaid-placeholder">pending</div></main>';
    await expect(exportRenderedHtml()).rejects.toThrow('Rendered content is unavailable');
    vi.mocked(isSandboxed).mockReturnValue(true);
    await expect(exportRenderedHtml()).rejects.toThrow('unavailable in this sandbox');
  });

  it('refuses missing/empty content and rechecks readiness after asynchronous collection', async () => {
    document.body.innerHTML = '';
    await expect(exportRenderedHtml()).rejects.toThrow('Rendered content is unavailable');
    document.body.innerHTML = '<main id="markview-container"></main>';
    await expect(exportRenderedHtml()).rejects.toThrow('Rendered content is unavailable');
    document.body.innerHTML = '<main id="markview-container"><p>Rendered</p></main>';
    vi.mocked(fetch).mockImplementation(async () => {
      document.querySelector('main')!.innerHTML = '<pre class="markview-raw-view">Raw now</pre>';
      return new Response('body{color:red}', { status: 200 });
    });
    await expect(exportRenderedHtml()).rejects.toThrow('Rendered content is unavailable');
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });

  it('cleans up and rethrows download failures', async () => {
    document.body.innerHTML = '<main id="markview-container"><p>Rendered</p></main>';
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:export');
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {
      throw new Error('blocked');
    });
    await expect(exportRenderedHtml()).rejects.toThrow('blocked');
    expect(revoke).toHaveBeenCalledWith('blob:export');
    expect(document.querySelector('a[download]')).toBeNull();
  });
});

describe('htmlExportFilename', () => {
  it('makes a document-derived safe html filename', () => {
    expect(htmlExportFilename('Report: Q1/2026')).toBe('Report_ Q1_2026.html');
    expect(htmlExportFilename('guide.md')).toBe('guide.html');
    expect(htmlExportFilename('')).toBe('document.html');
  });
});
