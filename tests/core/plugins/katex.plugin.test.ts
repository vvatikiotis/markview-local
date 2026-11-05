import { describe, expect, it } from 'vitest';
import { MarkdownRenderer } from '@core/markdown';

describe('katexPlugin with @mdit/plugin-katex', () => {
  it('renders inline and display math with HTML and accessible MathML', () => {
    const renderer = new MarkdownRenderer({ enabledPlugins: ['katex'] });
    const target = document.createElement('div');
    target.innerHTML = renderer.render('Inline $x^2$.\n\n$$\n\\frac{1}{2}\n$$');
    expect(target.querySelectorAll('.katex')).toHaveLength(2);
    expect(target.querySelectorAll('.katex math')).toHaveLength(2);
    expect(target.querySelectorAll('.katex-display')).toHaveLength(1);
    expect(target.querySelector('annotation')?.textContent).toBe('x^2');
  });

  it('renders invalid TeX as an error rather than failing the document', () => {
    const renderer = new MarkdownRenderer({ enabledPlugins: ['katex'] });
    const html = renderer.render('Before $\\frac{1$ after.');
    expect(html).toContain('Before');
    expect(html).toContain('after.');
    expect(html).toContain('katex-error');
    expect(html).toContain('#cc0000');
  });

  it('keeps math literal when disabled and ignores escaped dollar signs', () => {
    const disabled = new MarkdownRenderer({ disabledPlugins: ['katex'] });
    expect(disabled.render('$x$')).not.toContain('class="katex');
    const enabled = new MarkdownRenderer({ enabledPlugins: ['katex'] });
    expect(enabled.render('Cost \\$5.')).toBe('<p>Cost $5.</p>\n');
  });
});
