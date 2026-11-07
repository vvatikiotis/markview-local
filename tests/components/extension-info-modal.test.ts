import { afterEach, describe, expect, it, vi } from 'vitest';
import { isInaccessible } from '@testing-library/dom';
import { initI18n } from '@utils/i18n';
import { LOCALES } from '@utils/locales';
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

describe('extension-info-modal original-project attribution', () => {
  it.each(Object.entries(LOCALES))(
    'omits marketing and Quick Links while preserving visible credits and native links in %s',
    async (language, messages) => {
      vi.stubGlobal('chrome', {
        ...chrome,
        runtime: { ...chrome.runtime, getManifest: () => ({ version: '1.0.0' }) },
      });
      // The existing modal registers document listeners; remove this test's listeners after use.
      const listeners = vi.spyOn(document, 'addEventListener');
      try {
        await initI18n(language);
        await showExtensionInfoModal();
        const assertRemovedContentAbsent = () => {
          const modal = document.querySelector<HTMLElement>('.markview-extension-info-modal')!;
          expect(modal.querySelector('h2')).toBeNull();
          for (const suffix of [
            'section',
            'description',
            'features',
            'feature',
            'footer',
            'copyright',
          ]) {
            expect(modal.querySelector(`.markview-extension-info-${suffix}`)).toBeNull();
          }
          for (const text of [
            messages.extensionInfo_about.message,
            messages.extensionInfo_description.message,
            messages.extensionInfo_madeWith.message,
            messages.extensionInfo_forDevelopers.message,
            messages.extensionInfo_quickLinks.message,
            '180+ Programming Languages',
            'Mermaid Diagrams & Math',
            'Dark & Light Themes',
            'Print & Quick Settings',
            'Auto-Refresh & Live Preview',
            '12 Languages Support',
            '❤️',
            '© 2026 MarkView Team · MIT License',
          ]) {
            expect(modal.textContent).not.toContain(text);
          }
        };
        assertRemovedContentAbsent();
        await initI18n('en');
        document.dispatchEvent(new Event('markview:languageChanged'));
        expect(
          document.querySelector('.markview-extension-info-attribution')?.textContent
        ).toContain('Original author: MarkView Team');
        await initI18n(language);
        document.dispatchEvent(new Event('markview:languageChanged'));
        expect(document.querySelector('.markview-extension-info-title')?.textContent).toBe(
          'MarkView Local'
        );
        expect(document.querySelector('.markview-extension-info-version')?.textContent).toBe(
          'Version 1.0.0'
        );
        const modal = document.querySelector<HTMLElement>('.markview-extension-info-modal')!;
        assertRemovedContentAbsent();
        expect(modal.querySelector('.markview-extension-info-links')).toBeNull();
        expect(modal.querySelector('.markview-extension-info-link')).toBeNull();
        for (const shortcut of ['demo', 'whats-new', 'support', 'website', 'extension-store']) {
          expect(modal.querySelector(`[data-link="${shortcut}"]`)).toBeNull();
        }
        const credit = document.querySelector<HTMLElement>('.markview-extension-info-attribution')!;
        expect(isInaccessible(credit)).toBe(false);
        expect(credit.textContent).toContain(
          `${messages.attribution_originalAuthor.message} MarkView Team`
        );
        expect(credit.textContent).toContain(messages.attribution_modifiedBuild.message);
        const links = credit.querySelectorAll<HTMLAnchorElement>('a');
        expect([...modal.querySelectorAll('a')]).toEqual([...links]);
        expect([...links].map(link => link.href)).toEqual([
          'https://github.com/markview-app/markview',
          'https://getmarkview.com/',
        ]);
        expect([...links].map(link => link.textContent)).toEqual([
          messages.attribution_repository.message,
          messages.attribution_website.message,
        ]);
        for (const link of links) {
          expect(isInaccessible(link)).toBe(false);
          expect(link.target).toBe('_blank');
          expect(link.relList.contains('noopener')).toBe(true);
          expect(link.relList.contains('noreferrer')).toBe(true);
          // Observe the native link path, then prevent real network navigation in the test.
          document.body.addEventListener(
            'click',
            event => {
              expect(event.defaultPrevented).toBe(false);
              event.preventDefault();
            },
            { once: true }
          );
          expect(
            link.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
          ).toBe(false);
        }
      } finally {
        for (const [type, listener] of listeners.mock.calls) {
          if (type === 'markview:languageChanged') document.removeEventListener(type, listener);
        }
      }
    }
  );
});

describe('extension-info-modal dismissal', () => {
  it('closes on Escape, button and backdrop clicks while leaving other keys unhandled', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('chrome', {
      ...chrome,
      runtime: { ...chrome.runtime, getManifest: () => ({ version: '1.0.0' }) },
    });
    await showExtensionInfoModal();
    const overlay = document.querySelector<HTMLElement>('.markview-extension-info-overlay')!;
    for (const key of ['Tab', 'Enter']) {
      const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
      expect(overlay.querySelector('button')!.dispatchEvent(event)).toBe(true);
      expect(event.defaultPrevented).toBe(false);
      expect(overlay.style.opacity).not.toBe('0');
    }
    overlay
      .querySelector('button')!
      .dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    vi.advanceTimersByTime(200);
    expect(overlay.isConnected).toBe(false);
    await showExtensionInfoModal();
    document.querySelector<HTMLButtonElement>('.markview-extension-info-close')!.click();
    vi.advanceTimersByTime(200);
    expect(overlay.isConnected).toBe(false);
    await showExtensionInfoModal();
    document.querySelector<HTMLElement>('.markview-extension-info-overlay')!.click();
    vi.advanceTimersByTime(200);
    expect(document.querySelector('.markview-extension-info-overlay')).toBeNull();
  });
});
