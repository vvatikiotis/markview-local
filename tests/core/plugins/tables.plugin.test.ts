import { describe, expect, it } from 'vitest';
import MarkdownIt from 'markdown-it';
import { tablesPlugin } from '@core/plugins/definitions/tables.plugin';
import { MarkdownRenderer } from '@core/markdown';

function renderTable(source: string): HTMLTableElement {
  const target = document.createElement('div');
  target.innerHTML = new MarkdownRenderer({ enabledPlugins: ['tables'] }).render(source);
  const table = target.querySelector('table');
  expect(table).not.toBeNull();
  return table!;
}

describe('tablesPlugin with markdown-it 15', () => {
  it('renders rowspans, colspans, and captions', () => {
    const table = renderTable(
      'Stage | Product | Yield\n--- | --- | ---\nFirst | ATP ||\n^^ | NADH | 5\n[Energy]'
    );
    expect(table.querySelector('[rowspan="2"]')?.textContent).toBe('First');
    expect(table.querySelector('[colspan="2"]')?.textContent).toBe('ATP');
    expect(table.querySelector('caption')?.textContent).toBe('Energy');
  });

  it('renders headerless tables', () => {
    const table = renderTable('|---|---|\n|one|two|');
    expect(table.querySelector('thead')).toBeNull();
    expect([...table.querySelectorAll('td')].map(cell => cell.textContent)).toEqual(['one', 'two']);
  });

  it('parses multiline cells as blocks', () => {
    const table = renderTable(
      '| Items | Value |\n|---|---|\n| - First | one | \\\n| - Second | two |'
    );
    expect(table.querySelectorAll('tbody tr')).toHaveLength(1);
    expect([...table.querySelectorAll('td li')].map(item => item.textContent)).toEqual([
      'First',
      'Second',
    ]);
  });

  it('does not change markdown-it utilities for other plugins', () => {
    const md = new MarkdownIt();
    const utilities = md.utils;
    tablesPlugin.install(md);
    expect(md.utils).toBe(utilities);
    expect('assign' in md.utils).toBe(false);
    expect(md.render('|---|---|\n|one|two|')).toContain('<td>one</td>');
  });

  it('still allows tables to be disabled', () => {
    const html = new MarkdownRenderer({ disabledPlugins: ['tables'] }).render(
      '| A | B |\n|---|---|\n|one|two|'
    );
    expect(html).not.toContain('<table>');
  });
});
