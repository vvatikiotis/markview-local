import { readFileSync } from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { isInaccessible } from '@testing-library/dom';
vi.mock('@core/storage', () => {
  let language = 'en';
  return {
    DEFAULT_SETTINGS: {},
    getSettings: vi.fn(async () => ({ language, fontSize: 16, lineHeight: 1.6, maxWidth: 1000 })),
    updateSetting: vi.fn(async (key: string, value: string) => {
      if (key === 'language') language = value;
    }),
  };
});
import { SettingsTab } from '../../src/popup/settings-tab';
import { applyTranslations, initI18n } from '@utils/i18n';
import { LOCALES } from '@utils/locales';

const popupHTML = readFileSync(
  path.resolve(import.meta.dirname, '../../src/popup/index.html'),
  'utf8'
);

beforeEach(async () => {
  vi.useFakeTimers();
  chrome.storage.local.onChanged = chrome.storage.onChanged;
  document.body.innerHTML = popupHTML.split('<body>')[1]!.split('<script')[0]!;
  await initI18n('en');
  applyTranslations();
  await new SettingsTab(document.getElementById('tab-settings')!).initialize();
});
afterEach(() => {
  document.body.innerHTML = '';
  vi.clearAllTimers();
  vi.useRealTimers();
});

describe('popup original-project attribution', () => {
  it.each(Object.entries(LOCALES))(
    'keeps visible credit and safe destinations after switching to %s',
    async (language, messages) => {
      const select = document.querySelector<HTMLSelectElement>('#language')!;
      select.value = language;
      select.dispatchEvent(new Event('change'));
      await vi.waitFor(() =>
        expect(document.querySelector('[data-i18n="attribution_modifiedBuild"]')?.textContent).toBe(
          messages.attribution_modifiedBuild.message
        )
      );
      expect(document.querySelector('.popup-header h1')?.textContent).toBe('MarkView Local');
      const credit = document.querySelector<HTMLElement>('.popup-header .header-attribution')!;
      expect(isInaccessible(credit)).toBe(false);
      expect(credit.querySelector('strong')?.textContent).toBe('MarkView Team');
      expect(credit.querySelector('[data-i18n="attribution_originalAuthor"]')?.textContent).toBe(
        messages.attribution_originalAuthor.message
      );
      const links = credit.querySelectorAll<HTMLAnchorElement>('a');
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
        // Native anchor navigation is not swallowed by a scripted placeholder handler.
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
    }
  );
});
