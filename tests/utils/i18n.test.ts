import { afterEach, describe, expect, it, vi } from 'vitest';
vi.mock('@core/storage', () => ({ getSettings: vi.fn() }));
import { getSettings } from '@core/storage';
import { initI18n, getMessage } from '@utils/i18n';
import { LOCALES } from '@utils/locales';

afterEach(() => vi.restoreAllMocks());

describe('i18n key narrowing', () => {
  it('loads known locales and retains English fallback for unknown locales', async () => {
    await initI18n('vi');
    expect(getMessage('popup_settingsSaved')).toBe(LOCALES.vi.popup_settingsSaved.message);
    await initI18n('unsupported');
    expect(getMessage('popup_settingsSaved')).toBe(LOCALES.en.popup_settingsSaved.message);
  });

  it.each(['constructor', '__proto__', 'toString', 'missing'])(
    'does not treat inherited %s as a locale or message',
    async key => {
      await expect(initI18n(key)).resolves.toBeUndefined();
      expect(getMessage('popup_settingsSaved')).toBe(LOCALES.en.popup_settingsSaved.message);
      expect(getMessage(key)).toBe(key);
    }
  );

  it('retains browser language selection and unsupported language fallback', async () => {
    vi.spyOn(navigator, 'language', 'get').mockReturnValue('vi-VN');
    await initI18n('auto');
    expect(getMessage('popup_settingsSaved')).toBe(LOCALES.vi.popup_settingsSaved.message);
    vi.spyOn(navigator, 'language', 'get').mockReturnValue('unsupported');
    await initI18n('auto');
    expect(getMessage('popup_settingsSaved')).toBe(LOCALES.en.popup_settingsSaved.message);
    expect(getSettings).not.toHaveBeenCalled();
  });
});
