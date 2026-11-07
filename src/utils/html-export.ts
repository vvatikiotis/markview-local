import DOMPurify from 'dompurify';
import { logger } from './logger';
import { showNotification } from './notification';
import { MESSAGES } from './messages';
import { isSandboxed } from './sandbox-detection';
import {
  getCurrentTheme,
  getSyntaxThemePath,
  scopeThemeCss,
  SYNTAX_THEMES,
} from './syntax-theme-loader';

// Mermaid installs hooks on its default purifier; exports must not inherit them.
const exportPurifier = DOMPurify(window);

const SAFE_STYLE_PROPERTIES = new Set([
  'background-color',
  'border',
  'border-bottom',
  'border-bottom-style',
  'border-bottom-width',
  'border-color',
  'border-left',
  'border-right',
  'border-top',
  'bottom',
  'clip-path',
  'color',
  'display',
  'fill',
  'fill-opacity',
  'font-family',
  'font-size',
  'font-style',
  'font-weight',
  'height',
  'left',
  'line-height',
  'margin',
  'margin-bottom',
  'margin-left',
  'margin-right',
  'margin-top',
  'max-height',
  'max-width',
  'min-width',
  'opacity',
  'overflow',
  'padding',
  'padding-left',
  'position',
  'right',
  'stroke',
  'stroke-width',
  'stroke-dasharray',
  'stroke-dashoffset',
  'stroke-linecap',
  'stroke-linejoin',
  'marker-start',
  'marker-mid',
  'marker-end',
  'dominant-baseline',
  'text-decoration',
  'text-align',
  'text-anchor',
  'top',
  'transform',
  'vertical-align',
  'white-space',
  'width',
  'z-index',
]);

function sanitizeInlineStyle(style: string): string {
  return style
    .split(';')
    .map(declaration => {
      const separator = declaration.indexOf(':');
      if (separator < 1) return '';
      const property = declaration.slice(0, separator).trim().toLowerCase();
      const value = declaration.slice(separator + 1).trim();
      if (!SAFE_STYLE_PROPERTIES.has(property)) return '';
      const localReference =
        /^(?:marker-start|marker-mid|marker-end|clip-path|fill|stroke)$/.test(property) &&
        /^url\(["']?#[\w.:-]+["']?\)$/.test(value);
      if (
        !localReference &&
        (/url\s*\(|expression|javascript|var\s*\(|attr\s*\(|@|\\|\/\*/i.test(value) ||
          !/^[\w\s#.,%()+\-/'"]*$/.test(value))
      )
        return '';
      return `${property}:${value}`;
    })
    .filter(Boolean)
    .join(';');
}

/** Parse rules independently: Mermaid includes animation rules even in static diagrams. */
function svgStyleRules(css: string): CSSStyleRule[] {
  const sheet = new CSSStyleSheet();
  sheet.replaceSync(css);
  return [...sheet.cssRules].filter((rule): rule is CSSStyleRule => rule.type === 1);
}

function resolveReference(value: string, image = false): string | null {
  if (value.startsWith('#')) return value;
  if (image && /^data:image\/(?:png|gif|jpe?g|webp|avif|svg\+xml)(?:;[^,]*)?,/i.test(value))
    return value;
  try {
    const url = new URL(value, window.location.href);
    if (url.hash && url.href.split('#')[0] === window.location.href.split('#')[0]) return url.hash;
    if (
      /^(?:https?|file):$/.test(url.protocol) ||
      (!image && /^(?:mailto|tel):$/.test(url.protocol))
    )
      return url.href;
  } catch {
    /* Invalid references are removed, never fetched. */
  }
  return null;
}

/** Tokenize srcset URLs as non-whitespace tokens, not comma-separated strings (data URLs contain commas). */
function resolveSrcset(input: string): string {
  const candidates: string[] = [];
  let position = 0;
  while (position < input.length) {
    while (/[\t\n\f\r ,]/.test(input[position] ?? '') && position < input.length) position++;
    const start = position;
    while (position < input.length && !/[\t\n\f\r ]/.test(input[position] ?? '')) position++;
    let url = input.slice(start, position);
    let descriptors = '';
    if (url.endsWith(',')) url = url.replace(/,+$/, '');
    else {
      const descriptorStart = position;
      let parentheses = 0;
      while (position < input.length) {
        const character = input[position];
        if (character === ',' && parentheses === 0) break;
        if (character === '(') parentheses++;
        if (character === ')' && parentheses > 0) parentheses--;
        position++;
      }
      descriptors = input.slice(descriptorStart, position).trim();
      if (input[position] === ',') position++;
    }
    if (descriptors && !/^(?:[1-9]\d*w|(?:\d+(?:\.\d+)?|\.\d+)x)$/.test(descriptors)) continue;
    const resolved = resolveReference(url, true);
    if (resolved && url) candidates.push(`${resolved}${descriptors ? ` ${descriptors}` : ''}`);
  }
  return candidates.join(', ');
}

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    character =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character] ??
      character
  );
}

/** Build a portable static snapshot of MarkView's rendered content. */
export function buildHtmlExport(
  container: HTMLElement,
  title: string,
  dark: boolean,
  extensionStyles = ''
): string {
  const copy = container.cloneNode(true) as HTMLElement;
  copy
    .querySelectorAll(
      'button, input, select, textarea, script, iframe, frame, object, embed, link, animate, animateTransform, set, .markview-image-viewer, .mermaid-zoom-controls, [data-markview-ui]'
    )
    .forEach(node => node.remove());
  copy.querySelectorAll('foreignObject').forEach(label => {
    const parentSvg = label.closest('svg');
    if (!parentSvg) {
      label.remove();
      return;
    }
    const safeLabel = label.cloneNode(true) as Element;
    safeLabel.querySelectorAll('script, style').forEach(node => node.remove());
    const text = safeLabel.textContent?.replace(/\s+/g, ' ').trim() ?? '';
    const renderedLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    renderedLabel.setAttribute('class', 'nodeLabel');
    renderedLabel.setAttribute('fill', 'currentColor');
    renderedLabel.setAttribute('x', label.getAttribute('x') ?? '0');
    renderedLabel.setAttribute('y', String(Number(label.getAttribute('y') ?? '0') + 18));
    renderedLabel.textContent = text;
    label.replaceWith(renderedLabel);
  });
  const originalInlineStyles = new Map<Element, string>();
  copy.querySelectorAll('svg [style], svg[style]').forEach(element => {
    originalInlineStyles.set(element, element.getAttribute('style') ?? '');
    element.removeAttribute('style');
  });
  copy.querySelectorAll('style').forEach(style => {
    const svg = style.closest('svg');
    if (!svg) {
      style.remove();
      return;
    }
    for (const rule of svgStyleRules(style.textContent ?? '')) {
      const declarations = sanitizeInlineStyle(rule.style.cssText);
      if (!declarations) continue;
      for (const target of rule.selectorText.split(',')) {
        try {
          svg.querySelectorAll(target.trim()).forEach(element => {
            const combined = sanitizeInlineStyle(
              `${element.getAttribute('style') ?? ''};${declarations}`
            );
            if (combined) element.setAttribute('style', combined);
          });
        } catch {
          // Ignore selectors outside the supported static SVG subset.
        }
      }
    }
    style.remove();
  });
  for (const [element, inline] of originalInlineStyles) {
    element.setAttribute('style', `${element.getAttribute('style') ?? ''};${inline}`);
  }
  copy.querySelectorAll('img').forEach(image => {
    const deferred = image.getAttribute('data-src');
    if (deferred && !image.getAttribute('src')?.trim()) image.setAttribute('src', deferred);
    const deferredSrcset = image.getAttribute('data-srcset');
    if (deferredSrcset && !image.getAttribute('srcset')?.trim())
      image.setAttribute('srcset', deferredSrcset);
    image.removeAttribute('data-srcset');
    image.removeAttribute('data-src');
    image.removeAttribute('loading');
    image.classList.remove('lazy-loading', 'lazy-loaded');
  });
  copy.querySelectorAll('a[target]').forEach(anchor => {
    if (anchor.getAttribute('target')?.toLowerCase() === '_blank') {
      anchor.setAttribute('rel', 'noopener noreferrer');
    }
  });
  copy
    .querySelectorAll('[href], [src], [poster], [cite], [background], [xlink\\:href], [srcset]')
    .forEach(element => {
      for (const name of ['href', 'src', 'poster', 'cite', 'background', 'xlink:href']) {
        const value = element.getAttribute(name);
        if (value === null) continue;
        const resolved = resolveReference(value, ['img', 'source'].includes(element.localName));
        if (resolved) element.setAttribute(name, resolved);
        else element.removeAttribute(name);
      }
      const srcset = element.getAttribute('srcset');
      if (srcset !== null) {
        const resolved = resolveSrcset(srcset);
        if (resolved) element.setAttribute('srcset', resolved);
        else element.removeAttribute('srcset');
      }
    });
  copy.querySelectorAll('*').forEach(element => {
    for (const attribute of [...element.attributes]) {
      if (/^on/i.test(attribute.name)) {
        element.removeAttribute(attribute.name);
      } else if (
        attribute.name !== 'style' &&
        (/(?:chrome|moz)-extension:/i.test(attribute.value) ||
          (/^(?:fill|stroke|filter|mask|clip-path|cursor|marker-start|marker-mid|marker-end)$/.test(
            attribute.name
          ) &&
            /url\s*\(/i.test(attribute.value)))
      ) {
        const safeReference = sanitizeInlineStyle(`${attribute.name}:${attribute.value}`);
        if (!safeReference) element.removeAttribute(attribute.name);
      } else if (attribute.name.toLowerCase() === 'style') {
        const safeStyle = sanitizeInlineStyle(attribute.value);
        if (safeStyle) element.setAttribute('style', safeStyle);
        else element.removeAttribute(attribute.name);
      }
    }
  });
  const rootStyle = sanitizeInlineStyle(copy.getAttribute('style') ?? '');
  const rootClasses = ['markview-content'];
  for (const className of ['code-block-wrap', 'code-block-scroll']) {
    if (copy.classList.contains(className)) rootClasses.push(className);
  }
  const clean = exportPurifier.sanitize(copy.innerHTML, {
    ADD_TAGS: ['a', 'use', 'semantics', 'annotation'],
    ADD_ATTR: ['href', 'target', 'rel', 'viewbox', 'd', 'style', 'columnalign', 'columnspacing'],
    ALLOWED_URI_REGEXP:
      /^(?:#|(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp|matrix|file):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
    FORBID_TAGS: ['script', 'iframe', 'frame', 'object', 'embed', 'link'],
    FORBID_CONTENTS: ['script', 'iframe', 'frame', 'object', 'embed'],
  });
  const classes = ['markview-active', dark ? 'markview-dark' : 'markview-light'];
  if (document.documentElement.classList.contains('markview-external-syntax-theme')) {
    classes.push('markview-external-syntax-theme');
  }
  const portableExtensionStyles = extensionStyles.replace(/<\/style/gi, '<\\/style');
  const style = `${portableExtensionStyles}\nbody{margin:0;padding:2rem;font:16px/1.6 system-ui,sans-serif;color:#24292f;background:#fff}.markview-content{max-width:900px;margin:auto;overflow-wrap:anywhere}pre{overflow:auto;padding:1rem;background:#f6f8fa}code{font-family:ui-monospace,monospace}table{border-collapse:collapse}td,th{border:1px solid #d0d7de;padding:.4rem}img,svg{max-width:100%;height:auto}${dark ? 'body{color:#e6edf3;background:#0d1117}pre{background:#161b22}td,th{border-color:#30363d}' : ''}`;
  return `<!doctype html><html lang="en" class="${classes.join(' ')}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title><style>${style}</style></head><body><main id="markview-container" class="${rootClasses.join(' ')}"${rootStyle ? ` style="${escapeHtml(rootStyle)}"` : ''}>${clean}</main></body></html>`;
}

export function htmlExportFilename(sourceUrl: string): string {
  try {
    const filename = decodeURIComponent(new URL(sourceUrl).pathname.split('/').pop() ?? '');
    if (!/\.(?:markdown|mdx|mkd|md)$/i.test(filename)) return 'document.html';
    const documentName = filename.replace(/\.(?:markdown|mdx|mkd|md)$/i, '');
    const safeName = [...documentName]
      .map(character => {
        const code = character.charCodeAt(0);
        return /[\\/]/.test(character) || code < 32 || code === 127 ? '_' : character;
      })
      .join('');
    return `${safeName.trim() ? safeName : 'document'}.html`;
  } catch {
    return 'document.html';
  }
}

async function fetchAsset(path: string): Promise<Response> {
  const response = await fetch(chrome.runtime.getURL(path));
  if (!response.ok) throw new Error(`HTML export asset unavailable: ${path} (${response.status})`);
  return response;
}

/** Only bundled KaTeX WOFF2 files can be fetched; document CSS/URLs are never fetch inputs. */
export async function portableStylesheet(css: string, stylesheetUrl: string): Promise<string> {
  const fonts = new Map<string, string>();
  const matches = [...css.matchAll(/url\(\s*["']?([^"'()]+?)["']?\s*\)/gi)];
  for (const match of matches) {
    const value = match[1] ?? '';
    const url = new URL(value, stylesheetUrl);
    const path = url.pathname.slice(1);
    if (
      url.href !== chrome.runtime.getURL(path) ||
      !/^node_modules\/katex\/dist\/fonts\/KaTeX_[A-Za-z0-9_-]+\.woff2$/.test(path)
    )
      continue;
    const bytes = new Uint8Array(await (await fetchAsset(path)).arrayBuffer());
    if (String.fromCharCode(...bytes.slice(0, 4)) !== 'wOF2')
      throw new Error('Invalid bundled WOFF2 font');
    let binary = '';
    for (const byte of bytes) binary += String.fromCharCode(byte);
    fonts.set(match[0], `url("data:font/woff2;base64,${btoa(binary)}")`);
  }
  // WOFF/TTF alternatives are unnecessary once WOFF2 is embedded.
  return css
    .replace(/src\s*:[^;{}]+/gi, declaration => {
      const embedded = [...fonts].find(([original]) => declaration.includes(original));
      return embedded ? `src:${embedded[1]} format("woff2")` : 'src:none';
    })
    .replace(/url\(\s*(?:"[^"]*"|'[^']*'|[^)]*)\s*\)/gi, value => {
      if (/^url\(["']?data:/i.test(value)) return value;
      return 'none';
    });
}

export async function collectExtensionStyles(): Promise<string> {
  // Manifest-inserted css/content.css is not reliably exposed through document.styleSheets.
  const contentPath = 'css/content.css';
  const katexPath = 'node_modules/katex/dist/katex.min.css';
  const content = await (await fetchAsset(contentPath)).text();
  const katex = await (await fetchAsset(katexPath)).text();
  const rules = [
    await portableStylesheet(content, chrome.runtime.getURL(contentPath)),
    await portableStylesheet(katex, chrome.runtime.getURL(katexPath)),
  ];
  const theme = getCurrentTheme();
  if (theme !== 'custom' && SYNTAX_THEMES.some(item => item.id === theme)) {
    const path = getSyntaxThemePath(theme);
    rules.push(scopeThemeCss(await (await fetchAsset(path)).text()));
  }
  return rules.join('\n');
}

function renderedContainer(): HTMLElement {
  const container = document.getElementById('markview-container');
  if (isSandboxed()) throw new Error('HTML export is unavailable in this sandbox');
  if (
    !container ||
    (!container.textContent?.trim() && !container.querySelector('img,svg,math')) ||
    container.querySelector('.markview-raw-view, .mermaid-placeholder')
  ) {
    throw new Error('Rendered content is unavailable');
  }
  return container;
}

export async function exportRenderedHtml(): Promise<void> {
  renderedContainer();
  const styles = await collectExtensionStyles();
  const html = buildHtmlExport(
    renderedContainer(),
    document.title || 'document',
    document.documentElement.classList.contains('markview-dark'),
    styles
  );
  const url = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = htmlExportFilename(window.location.href);
  try {
    document.body.appendChild(anchor);
    anchor.click();
    showNotification(MESSAGES.actions.exportHtml, 'success');
  } catch (error) {
    logger.error('[HtmlExport] Download failed', error);
    throw error;
  } finally {
    anchor.remove();
    URL.revokeObjectURL(url);
  }
}
