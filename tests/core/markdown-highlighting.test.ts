// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { MarkdownRenderer } from '@core/markdown';

// Representative scanner-style Python, not copied from the personal document.
const python = 'import pandas as pd\n\ndef scan_market(prices):\n    return pd.Series(prices)\n';
const fence = (code: string, language = '') => `\`\`\`${language}\n${code}\`\`\``;
const indent = (code: string) =>
  code
    .split('\n')
    .map(line => `    ${line}`)
    .join('\n');

function render(markdown: string, options = {}) {
  const container = document.createElement('div');
  container.innerHTML = new MarkdownRenderer(options).render(markdown);
  return container;
}

describe('Markdown automatic code highlighting', () => {
  it.each([fence, indent])('highlights unlabeled Python via %s', block => {
    const code = render(block(python)).querySelector('pre code')!;
    expect(code.classList.contains('hljs')).toBe(true);
    expect(code.querySelector('.hljs-keyword')?.textContent).toBe('import');
    expect(code.querySelector('.hljs-title.function_')?.textContent).toBe('scan_market');
    expect(code.textContent).toBe(python);
  });

  it.each(['python', 'py', 'javascript', 'js'])('retains explicit %s highlighting', language => {
    const source = ['python', 'py'].includes(language) ? python : 'const answer = 42;\n';
    const code = render(fence(source, language)).querySelector('pre code')!;
    expect(code.classList.contains(`language-${language}`)).toBe(true);
    expect(code.querySelector('.hljs-keyword')).not.toBeNull();
    expect(code.textContent).toBe(source);
  });

  it.each(['plaintext', 'text', 'unknown-language'])('does not detect explicit %s', language => {
    const code = render(fence(python + '<script>&\n', language)).querySelector('pre code')!;
    expect(code.querySelector('span')).toBeNull();
    expect(code.textContent).toBe(python + '<script>&\n');
    expect(code.querySelector('script')).toBeNull();
  });

  it.each([{ highlight: false }, { disabledPlugins: ['highlight'] }])(
    'respects disabled highlighting %j in both block paths',
    options => {
      for (const block of [fence(python), indent(python), fence(python, 'py')]) {
        const code = render(block, options).querySelector('pre code')!;
        expect(code.querySelector('span')).toBeNull();
        expect(code.textContent).toBe(python);
      }
    }
  );

  it.each([fence, indent])('escapes HTML-like unlabeled content via %s', block => {
    const source = '<script>alert("unsafe")</script>\n';
    const code = render(block(source)).querySelector('pre code')!;
    expect(code.querySelector('script')).toBeNull();
    expect(code.textContent).toBe(source);
  });

  it.each([fence, indent])('leaves zero-evidence content plain via %s', block => {
    const code = render(block('xyzzy &\n')).querySelector('pre code')!;
    expect(code.querySelector('span')).toBeNull();
    expect(code.textContent).toBe('xyzzy &\n');
  });

  it('preserves Mermaid handling and its disabled fallback', () => {
    const markdown = fence('graph TD; A-->B;\n', 'mermaid');
    expect(render(markdown).querySelector('.mermaid-placeholder')).not.toBeNull();
    expect(
      render(markdown, { highlight: false }).querySelector('.mermaid-placeholder')
    ).not.toBeNull();
    const disabled = render(markdown, { mermaid: false });
    expect(disabled.querySelector('.mermaid-placeholder')).toBeNull();
    expect(disabled.querySelector('pre code')?.textContent).toBe('graph TD; A-->B;\n');
    expect(disabled.querySelector('pre code span')).toBeNull();
  });
});
