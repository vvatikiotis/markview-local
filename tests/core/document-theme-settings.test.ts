import { afterEach, expect, it, vi } from 'vitest';
import { getSettings, updateSetting, updateSettings } from '@core/storage';

// Exercise the real storage wrapper, including merging old settings with defaults.
afterEach(() => vi.unstubAllGlobals());
it('persists the document theme across storage reloads without changing other themes', async () => {
  const stored: Record<string, unknown> = { theme: 'light', syntaxTheme: 'github-dark' };
  vi.stubGlobal('chrome', {
    ...chrome,
    runtime: { ...chrome.runtime, id: 'test-extension' },
    storage: {
      ...chrome.storage,
      local: {
        ...chrome.storage.local,
        get: vi.fn(async () => ({ ...stored })),
        set: vi.fn(async values => Object.assign(stored, values)),
      },
    },
  });
  await updateSettings({}); // Clear any existing cache.
  expect((await getSettings()).documentTheme).toBe('default');
  await updateSetting('documentTheme', 'catppuccin-pitch-black');
  vi.resetModules();
  const reloadedStorage = await import('@core/storage');
  expect(await reloadedStorage.getSettings()).toMatchObject({
    documentTheme: 'catppuccin-pitch-black',
    theme: 'light',
    syntaxTheme: 'github-dark',
  });
  await reloadedStorage.updateSetting('documentTheme', 'default');
  expect((await reloadedStorage.getSettings()).documentTheme).toBe('default');
});
