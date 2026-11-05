import { afterEach, describe, expect, it, vi } from 'vitest';
vi.mock('@core/storage', async importOriginal => {
  const original = await importOriginal<typeof import('@core/storage')>();
  return { ...original, getSettings: vi.fn().mockResolvedValue(original.DEFAULT_SETTINGS) };
});
import { showExtensionInfoModal } from '@components/extension-info-modal';

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('extension-info-modal mouse dismissal without keybindings', () => {
  it('leaves Escape and native control keys unhandled but closes on button and backdrop clicks', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('chrome', {
      ...chrome,
      runtime: { ...chrome.runtime, getManifest: () => ({ version: '1.0.0' }) },
    });
    const listeners = vi.spyOn(document, 'addEventListener');
    await showExtensionInfoModal();
    const overlay = document.querySelector<HTMLElement>('.markview-extension-info-overlay')!;
    for (const key of ['Escape', 'Tab', 'Enter']) {
      const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
      expect(overlay.querySelector('button')!.dispatchEvent(event)).toBe(true);
      expect(event.defaultPrevented).toBe(false);
      expect(overlay.style.opacity).not.toBe('0');
    }
    expect(listeners.mock.calls.some(([type]) => /^key(down|up|press)$/.test(type))).toBe(false);
    overlay.querySelector<HTMLButtonElement>('.markview-extension-info-close')!.click();
    vi.advanceTimersByTime(200);
    expect(overlay.isConnected).toBe(false);
    await showExtensionInfoModal();
    document.querySelector<HTMLElement>('.markview-extension-info-overlay')!.click();
    vi.advanceTimersByTime(200);
    expect(document.querySelector('.markview-extension-info-overlay')).toBeNull();
  });
});
