// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { render } = vi.hoisted(() => ({ render: vi.fn() }));
vi.mock('mermaid', () => ({
  default: { initialize: vi.fn(), render: (...args: unknown[]) => render(...args) },
}));
vi.mock('@components/mermaid-zoom', () => ({ initMermaidZoom: vi.fn() }));
import { renderMermaidDiagrams, reRenderDiagrams } from '@utils/mermaid-renderer';

const output = `
  <svg id="chart-svg">
    <style>.x { fill: red }</style>
    <foreignObject>
      <div>label<template><iframe></iframe><template><frame></frame></template></template></div>
    </foreignObject>
    <template><iframe></iframe></template>
    <rect class="x"/>
  </svg>
  <template><iframe></iframe><frameset></frameset></template>
  <iframe src="https://example.test"></iframe><frame></frame><frameset></frameset>
`;

function framesIncludingTemplateContents(root: ParentNode): Element[] {
  return [
    ...Array.from(root.querySelectorAll('iframe, frame, frameset')),
    ...Array.from(root.querySelectorAll('template')).flatMap(template =>
      template instanceof HTMLTemplateElement
        ? framesIncludingTemplateContents(template.content)
        : []
    ),
  ];
}

beforeEach(() => {
  document.body.innerHTML = '';
  render.mockReset();
});

describe('Mermaid returned markup', () => {
  it('filters frames from initial output and retains SVG, labels, and bindings', async () => {
    const bindFunctions = vi.fn();
    render.mockResolvedValue({ svg: output, bindFunctions });
    const placeholder = document.createElement('div');
    placeholder.className = 'mermaid-placeholder';
    placeholder.id = 'chart';
    placeholder.setAttribute('data-code', 'graph TD; A-->B');
    document.body.append(placeholder);

    await renderMermaidDiagrams();
    const container = document.querySelector('.mermaid-container');
    expect(container).not.toBeNull();
    expect(framesIncludingTemplateContents(container!)).toEqual([]);
    expect(container?.querySelector('svg style')?.textContent).toContain('.x');
    expect(container?.querySelector('svg rect.x')).not.toBeNull();
    expect(container?.querySelector('foreignObject div')?.textContent).toBe('label');
    expect(bindFunctions).toHaveBeenCalledWith(container?.querySelector('svg'));
  });

  it('filters frames from theme rerender output and preserves actions and bindings', async () => {
    const bindFunctions = vi.fn();
    render.mockResolvedValue({ svg: output, bindFunctions });
    const container = document.createElement('div');
    container.className = 'mermaid-container';
    container.setAttribute('data-mermaid-code', 'graph TD; A-->B');
    container.innerHTML =
      '<svg id="chart-svg"><rect/></svg><button class="mermaid-action-buttons">copy</button>';
    document.body.append(container);

    await reRenderDiagrams();
    expect(framesIncludingTemplateContents(container)).toEqual([]);
    expect(container.querySelector('svg style')?.textContent).toContain('.x');
    expect(container.querySelector('foreignObject div')?.textContent).toBe('label');
    expect(container.querySelector('.mermaid-action-buttons')?.textContent).toBe('copy');
    expect(bindFunctions).toHaveBeenCalledWith(container.querySelector('svg'));
  });
});

describe('Mermaid error boundary', () => {
  it.each([
    [new Error('<unsafe>'), '<unsafe>'],
    [{ message: '<plain object>' }, '<plain object>'],
    [{ message: 123 }, 'Failed to render Mermaid diagram'],
    [null, 'Failed to render Mermaid diagram'],
    ['failure', 'Failed to render Mermaid diagram'],
  ])(
    'handles rejected value %j without unsafe access or HTML injection',
    async (failure, expected) => {
      render.mockRejectedValue(failure);
      document.body.innerHTML =
        '<div class="mermaid-placeholder" id="error-chart" data-code="graph TD; A--&gt;B"></div>';
      await expect(renderMermaidDiagrams()).resolves.toBeUndefined();
      expect(document.querySelector('.mermaid-error pre')?.textContent).toBe(expected);
      expect(document.querySelector('.mermaid-error pre')?.children).toHaveLength(0);
    }
  );
});
