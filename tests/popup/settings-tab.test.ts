import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('@core/storage', async importOriginal => {
  const original = await importOriginal<typeof import('@core/storage')>();
  return {
    ...original,
    getSettings: vi.fn().mockResolvedValue(original.DEFAULT_SETTINGS),
    updateSetting: vi.fn().mockResolvedValue(undefined),
  };
});
import { updateSetting } from '@core/storage';
import { SettingsTab } from '../../src/popup/settings-tab';

beforeEach(async () => {
  vi.useFakeTimers();
  document.body.innerHTML =
    '<select id="documentTheme"><option value="default">Default</option><option value="catppuccin-pitch-black">Catppuccin Pitch Black</option></select><select id="language"><option value="auto">Auto</option></select><select id="theme"><option value="light">Light</option></select><select id="codeBlockDisplay"><option value="scroll">Scroll</option></select>';
  chrome.storage.local.onChanged = chrome.storage.onChanged;
  vi.mocked(updateSetting).mockClear();
  await new SettingsTab(document.body).initialize();
});
afterEach(() => {
  document.body.innerHTML = '';
  vi.clearAllTimers();
  vi.useRealTimers();
});

function change(id: string, value: string): void {
  const select = document.querySelector<HTMLSelectElement>(`#${id}`);
  if (!select) throw new Error(`Missing ${id}`);
  const option = document.createElement('option');
  option.value = value;
  select.add(option);
  select.value = value;
  select.dispatchEvent(new Event('change'));
}

describe('settings-tab select narrowing', () => {
  it.each([
    ['language', 'constructor'],
    ['language', 'unknown'],
    ['theme', 'other'],
    ['documentTheme', 'other'],
    ['codeBlockDisplay', 'other'],
  ])('rejects invalid %s selection %s', async (key, value) => {
    change(key, value);
    await Promise.resolve();
    expect(updateSetting).not.toHaveBeenCalled();
  });

  it.each([
    ['language', 'vi'],
    ['theme', 'dark'],
    ['documentTheme', 'catppuccin-pitch-black'],
    ['documentTheme', 'default'],
  ])('saves valid %s selection %s', async (key, value) => {
    change(key, value);
    await vi.waitFor(() => expect(updateSetting).toHaveBeenCalledExactlyOnceWith(key, value));
  });

  it('saves a valid nested display setting', async () => {
    change('codeBlockDisplay', 'wrap');
    await vi.waitFor(() =>
      expect(updateSetting).toHaveBeenCalledExactlyOnceWith('displaySettings', {
        codeBlockDisplay: 'wrap',
      })
    );
  });
});
