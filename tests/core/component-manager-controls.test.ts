import { afterEach, describe, expect, it, vi } from 'vitest';
vi.mock('@core/storage', async importOriginal => {
  const original = await importOriginal<typeof import('@core/storage')>();
  return {
    ...original,
    getSettings: vi.fn().mockResolvedValue(original.DEFAULT_SETTINGS),
    updateSetting: vi.fn().mockResolvedValue(undefined),
  };
});
vi.mock('@utils/notification', () => ({ showNotification: vi.fn() }));
vi.mock('@utils/sandbox-detection', () => ({ isSandboxed: () => false }));
import {
  createComponentInstances,
  initializeComponents,
  destroyAllComponents,
} from '@core/component-manager';
import { updateSetting } from '@core/storage';
import { MESSAGES } from '@utils/messages';

const components = createComponentInstances();
afterEach(() => {
  destroyAllComponents(components);
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
  document.body.innerHTML = '';
  document.documentElement.className = '';
});

function click(selector: string): void {
  const button = document.querySelector<HTMLButtonElement>(selector);
  if (!button) throw new Error(`Missing control: ${selector}`);
  button.click();
}

async function openActions(): Promise<void> {
  click('#markview-actions-toggle');
  await vi.waitFor(() =>
    expect(document.querySelector('.markview-actions-menu.menu-open')).not.toBeNull()
  );
}

describe('component-manager mouse controls without extension keybindings', () => {
  it('leaves former commands unhandled and keeps explicit controls operational', async () => {
    document.body.innerHTML = '<div id="markview-container"><h1>Heading</h1></div><input>';
    const documentListeners = vi.spyOn(document, 'addEventListener');
    const windowListeners = vi.spyOn(window, 'addEventListener');
    const scroll = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    const print = vi.fn();
    vi.stubGlobal('print', print);
    await initializeComponents(components);
    await vi.waitFor(() => expect(document.getElementById('markview-theme-toggle')).not.toBeNull());
    const toc = document.getElementById('markview-toc-sidebar')!;
    const initialDisplay = toc.style.display;

    const keys: KeyboardEventInit[] = [
      ...['d', 'c', 'm', 'l', 'k'].flatMap(key => [
        { key, ctrlKey: true, shiftKey: true },
        { key: key.toUpperCase(), metaKey: true, shiftKey: true },
      ]),
      { key: 'Home' },
      { key: 'Escape' },
      { key: 'ArrowLeft' },
      { key: 'ArrowRight' },
      { key: 'p', ctrlKey: true },
      { key: 'p', metaKey: true },
      { key: 'Tab' },
      { key: 'Enter' },
    ];
    for (const target of [
      document,
      document.querySelector('input')!,
      document.querySelector('button')!,
    ]) {
      for (const init of keys) {
        const event = new KeyboardEvent('keydown', { ...init, bubbles: true, cancelable: true });
        expect(target.dispatchEvent(event)).toBe(true);
        expect(event.defaultPrevented).toBe(false);
      }
    }
    expect(updateSetting).not.toHaveBeenCalled();
    expect(scroll).not.toHaveBeenCalled();
    expect(print).not.toHaveBeenCalled();
    expect(components.rawToggle?.isInRawMode()).toBe(false);
    expect(toc.style.display).toBe(initialDisplay);
    expect(document.querySelector('.markview-quick-settings-overlay')).toBeNull();
    expect(document.querySelector('.markview-actions-menu.menu-open')).toBeNull();
    expect(document.documentElement.classList.contains('markview-dark')).toBe(false);
    for (const listeners of [documentListeners, windowListeners]) {
      expect(listeners.mock.calls.map(call => call[0])).not.toEqual(
        expect.arrayContaining([expect.stringMatching(/^key(?:down|up|press)$/)])
      );
    }

    click('#markview-theme-toggle');
    expect(document.documentElement.classList.contains('markview-dark')).toBe(true);
    expect(updateSetting).toHaveBeenCalledWith('theme', 'dark');
    click('#markview-centered-toggle');
    await vi.waitFor(() => expect(updateSetting).toHaveBeenCalledWith('centered', false));
    click('#markview-scroll-top');
    expect(scroll).toHaveBeenCalledExactlyOnceWith({ top: 0, behavior: 'smooth' });
    click('.markview-toc-controls button');
    expect(toc.style.display).toBe('none');
    click('#markview-toc-toggle');
    expect(toc.style.display).toBe('');

    await openActions();
    expect(
      Array.from(document.querySelectorAll('.markview-menu-item-label'), item => item.textContent)
    ).toEqual([
      MESSAGES.actions.print,
      MESSAGES.actions.exportHtml,
      MESSAGES.ui.toggleRaw,
      MESSAGES.actions.quickSettings,
      MESSAGES.actions.extensionInfo,
    ]);
    click('.markview-menu-item:nth-child(1)');
    expect(print).toHaveBeenCalledOnce();
    await openActions();
    click('.markview-menu-item:nth-child(3)');
    expect(components.rawToggle?.isInRawMode()).toBe(true);
    expect(document.querySelector('.markview-raw-view')).not.toBeNull();
    await openActions();
    click('.markview-menu-item:nth-child(3)');
    expect(components.rawToggle?.isInRawMode()).toBe(false);
    await openActions();
    click('.markview-menu-item:nth-child(4)');
    await vi.waitFor(() =>
      expect(document.querySelector('.markview-quick-settings-overlay')).not.toBeNull()
    );
    click('.markview-quick-settings-close');
    await vi.waitFor(() =>
      expect(document.querySelector('.markview-quick-settings-overlay')).toBeNull()
    );
  });
});
