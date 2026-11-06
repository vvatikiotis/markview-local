import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('@core/storage', async importOriginal => {
  const original = await importOriginal<typeof import('@core/storage')>();
  return { ...original, getSettings: vi.fn().mockResolvedValue(original.DEFAULT_SETTINGS) };
});
vi.mock('@utils/sandbox-detection', () => ({ isSandboxed: vi.fn().mockReturnValue(false) }));
vi.mock('@utils/notification', () => ({ showNotification: vi.fn() }));
import { ActionButtons } from '@components/action-buttons';
import { isSandboxed } from '@utils/sandbox-detection';
import { showNotification } from '@utils/notification';
import { MESSAGES } from '@utils/messages';
import * as htmlExport from '@utils/html-export';

const originalPrint = window.print;
beforeEach(() => {
  window.print = vi.fn();
  document.body.innerHTML = '';
});
afterEach(() => {
  vi.restoreAllMocks();
  window.print = originalPrint;
  vi.mocked(isSandboxed).mockReturnValue(false);
  vi.mocked(showNotification).mockClear();
  document.body.innerHTML = '';
});

async function menuListener(label = MESSAGES.actions.print) {
  const actions = new ActionButtons();
  const listeners = vi.spyOn(HTMLButtonElement.prototype, 'addEventListener');
  await actions['createMenu']();
  const button = [...document.querySelectorAll<HTMLButtonElement>('.markview-menu-item')].find(
    item => item.textContent?.includes(label)
  );
  if (!button) throw new Error('Missing print action');
  const listener = listeners.mock.calls.find(
    (call, index) => call[0] === 'click' && listeners.mock.contexts[index] === button
  )?.[1];
  if (typeof listener !== 'function') throw new Error('Missing print click listener');
  return () =>
    (listener as (event: Event) => Promise<void>).call(
      button,
      new MouseEvent('click', { cancelable: true })
    );
}

describe('Actions menu keyboard dismissal', () => {
  it('closes on Escape from a menu item and can reopen, while leaving other keys alone', async () => {
    const listeners = vi.spyOn(document, 'addEventListener');
    const actions = new ActionButtons();
    try {
      const toggle = document.querySelector<HTMLButtonElement>('#markview-actions-toggle')!;
      const openMenu = async () => {
        toggle.click();
        await vi.waitFor(() =>
          expect(
            document.querySelector('#markview-actions-menu')?.classList.contains('menu-open')
          ).toBe(true)
        );
        return document.querySelector<HTMLElement>('#markview-actions-menu')!;
      };

      const menu = await openMenu();
      const item = menu.querySelector('button')!;
      item.focus();
      for (const key of ['Tab', 'Enter', 'ArrowDown']) {
        const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
        item.dispatchEvent(event);
        expect(event.defaultPrevented).toBe(false);
        expect(menu.classList.contains('menu-open')).toBe(true);
      }

      item.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      expect(menu.classList.contains('menu-open')).toBe(false);

      await openMenu();
      toggle.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      expect(
        document.querySelector('#markview-actions-menu')?.classList.contains('menu-open')
      ).toBe(false);
    } finally {
      actions.destroy();
      for (const [type, listener] of listeners.mock.calls) {
        document.removeEventListener(type, listener);
      }
    }
  });
});

describe('HTML export action restrictions', () => {
  it('disables the export item in raw mode and sandbox contexts', async () => {
    const actions = new ActionButtons();
    document.dispatchEvent(new CustomEvent('markview:rawViewEnabled'));
    await actions['createMenu']();
    const exportItem = [
      ...document.querySelectorAll<HTMLButtonElement>('.markview-menu-item'),
    ].find(item => item.textContent?.includes(MESSAGES.actions.exportHtml));
    expect(exportItem?.getAttribute('data-disabled')).toBe('true');
    expect(exportItem?.title).toBe(MESSAGES.ui.notAvailableInRawMode);

    document.dispatchEvent(new CustomEvent('markview:rawViewDisabled'));
    vi.mocked(isSandboxed).mockReturnValue(true);
    await actions['createMenu']();
    const sandboxExportItem = [
      ...document.querySelectorAll<HTMLButtonElement>('.markview-menu-item'),
    ].find(item => item.textContent?.includes(MESSAGES.actions.exportHtml));
    expect(sandboxExportItem?.getAttribute('data-disabled')).toBe('true');
    expect(sandboxExportItem?.title).toBe(MESSAGES.notification.sandboxRestriction);
    actions.destroy();
  });
});

describe('action-buttons click Promise contract', () => {
  it('runs actions immediately and returns a resolved Promise', async () => {
    const print = vi.spyOn(window, 'print').mockImplementation(() => {});
    const click = await menuListener();
    const pending = click();
    expect(pending).toBeInstanceOf(Promise);
    expect(print).toHaveBeenCalledOnce();
    await expect(pending).resolves.toBeUndefined();
  });

  it('retains rejected-Promise error propagation instead of synchronous throws', async () => {
    const failure = new Error('print unavailable');
    vi.spyOn(window, 'print').mockImplementation(() => {
      throw failure;
    });
    const click = await menuListener();
    await expect(click()).rejects.toBe(failure);
  });

  it('uses the statically imported notification for restricted actions', async () => {
    vi.mocked(isSandboxed).mockReturnValue(true);
    const print = vi.spyOn(window, 'print').mockImplementation(() => {});
    const click = await menuListener();
    await expect(click()).resolves.toBeUndefined();
    expect(print).not.toHaveBeenCalled();
    expect(showNotification).toHaveBeenCalledWith(expect.any(String), 'info', 3000);
  });
});

describe('HTML export asynchronous action', () => {
  it('waits for collection/download before the click Promise resolves', async () => {
    let finish!: () => void;
    const exportHtml = vi.spyOn(htmlExport, 'exportRenderedHtml').mockImplementation(
      () =>
        new Promise<void>(resolve => {
          finish = resolve;
        })
    );
    const click = await menuListener(MESSAGES.actions.exportHtml);
    let completed = false;
    const pending = click().then(() => {
      completed = true;
    });
    await vi.waitFor(() => expect(exportHtml).toHaveBeenCalledOnce());
    expect(completed).toBe(false);
    finish();
    await pending;
    expect(completed).toBe(true);
  });

  it('reports asynchronous collection/download failures without an unhandled rejection', async () => {
    vi.spyOn(htmlExport, 'exportRenderedHtml').mockRejectedValue(new Error('font missing'));
    const click = await menuListener(MESSAGES.actions.exportHtml);
    await expect(click()).resolves.toBeUndefined();
    expect(showNotification).toHaveBeenCalledWith(MESSAGES.actions.exportHtmlFailed, 'error', 3000);
  });
});
