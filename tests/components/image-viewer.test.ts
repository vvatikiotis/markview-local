import { afterEach, describe, expect, it, vi } from 'vitest';
import { imageViewer } from '@components/image-viewer';

afterEach(() => {
  imageViewer.destroy();
  document.body.innerHTML = '';
  vi.restoreAllMocks();
  vi.useRealTimers();
});

function click(selector: string): void {
  const control = document.querySelector<HTMLElement>(selector);
  if (!control) throw new Error(`Missing control: ${selector}`);
  control.click();
}

describe('image-viewer mouse controls without keybindings', () => {
  it('ignores arrows, zoom keys and Escape while image, navigation, zoom and close clicks work', () => {
    vi.useFakeTimers();
    const listeners = vi.spyOn(document, 'addEventListener');
    document.body.innerHTML =
      '<div id="markview-container"><img src="https://example.com/first.png"><img src="https://example.com/second.png"></div>';
    for (const image of document.querySelectorAll('img')) {
      Object.defineProperty(image, 'naturalWidth', { value: 800 });
      Object.defineProperty(image, 'naturalHeight', { value: 600 });
    }
    click('img');
    vi.advanceTimersByTime(20);
    const modal = document.getElementById('markview-image-modal')!;
    const image = modal.querySelector('img')!;
    const initialTransform = image.style.transform;
    expect(modal.classList.contains('opened')).toBe(true);
    expect(document.querySelector('.markview-image-counter')?.textContent).toBe('1 / 2');
    for (const key of ['ArrowRight', 'ArrowLeft', 'Escape', '+', '-', '0', 'Enter', 'Tab']) {
      const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
      expect(image.dispatchEvent(event)).toBe(true);
      expect(event.defaultPrevented).toBe(false);
      expect(modal.classList.contains('opened')).toBe(true);
      expect(image.src).toBe('https://example.com/first.png');
      expect(image.style.transform).toBe(initialTransform);
      expect(document.querySelector('.markview-image-counter')?.textContent).toBe('1 / 2');
    }
    expect(listeners.mock.calls.some(([type]) => /^key(down|up|press)$/.test(type))).toBe(false);
    click('.markview-image-next');
    expect(image.src).toBe('https://example.com/second.png');
    expect(document.querySelector('.markview-image-counter')?.textContent).toBe('2 / 2');
    click('.markview-image-prev');
    expect(image.src).toBe('https://example.com/first.png');
    click('[data-action="zoom-in"]');
    expect(image.style.transform).not.toBe(initialTransform);
    click('[data-action="zoom-out"]');
    expect(image.style.transform).toContain('scale(1)');
    click('[data-action="zoom-in"]');
    click('[data-action="reset"]');
    expect(image.style.transform).toContain('scale(1)');
    click('[data-action="close"]');
    expect(modal.classList.contains('opened')).toBe(false);
    vi.advanceTimersByTime(400);
    expect(modal.style.display).toBe('none');
    expect(document.querySelector('img')?.style.visibility).toBe('');
    click('img');
    vi.advanceTimersByTime(20);
    modal.click();
    expect(modal.classList.contains('opened')).toBe(false);
  });
});
