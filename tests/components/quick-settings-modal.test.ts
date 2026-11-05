import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('@core/storage', async importOriginal => {
  const original = await importOriginal<typeof import('@core/storage')>();
  return {
    ...original,
    getSettings: vi.fn().mockResolvedValue(original.DEFAULT_SETTINGS),
    updateSetting: vi.fn().mockResolvedValue(undefined),
  };
});
vi.mock('@utils/notification', () => ({ showNotification: vi.fn() }));
import { updateSetting } from '@core/storage';
import { showQuickSettingsModal } from '@components/quick-settings-modal';

beforeEach(async () => {
  vi.useFakeTimers();
  document.body.innerHTML = '';
  vi.mocked(updateSetting).mockClear();
  await showQuickSettingsModal();
});
afterEach(() => {
  document.querySelector<HTMLButtonElement>('.markview-quick-settings-close')?.click();
  vi.advanceTimersByTime(200);
  document.body.innerHTML = '';
  vi.useRealTimers();
});

function selectValue(setting: string, value: string): void {
  const select = document.querySelector<HTMLSelectElement>(`select[data-setting="${setting}"]`);
  if (!select) throw new Error(`Missing ${setting} control`);
  const option = document.createElement('option');
  option.value = value;
  select.add(option);
  select.value = value;
  select.dispatchEvent(new Event('change'));
}

describe('quick-settings-modal setting boundaries', () => {
  it.each([
    ['language', 'vi'],
    ['language', 'auto'],
    ['fontFamily', 'default'],
  ])('saves supported %s value %s', async (setting, value) => {
    selectValue(setting, value);
    await vi.waitFor(() => expect(updateSetting).toHaveBeenCalledExactlyOnceWith(setting, value));
  });

  it.each(['wrap', 'scroll'])('saves valid nested display value %s', async value => {
    selectValue('codeBlockDisplay', value);
    await vi.waitFor(() =>
      expect(updateSetting).toHaveBeenCalledExactlyOnceWith('displaySettings', {
        codeBlockDisplay: value,
      })
    );
  });

  it.each([
    ['language', 'constructor'],
    ['language', 'invalid'],
    ['codeBlockDisplay', 'invalid'],
  ])('ignores malformed %s value %s', async (setting, value) => {
    selectValue(setting, value);
    await Promise.resolve();
    expect(updateSetting).not.toHaveBeenCalled();
  });

  it('does not let modified select names update unrelated setting types', async () => {
    const select = document.querySelector<HTMLSelectElement>('select[data-setting="fontFamily"]');
    if (!select) throw new Error('Missing fontFamily control');
    select.dataset.setting = 'enabled';
    selectValue('enabled', 'false');
    await Promise.resolve();
    expect(updateSetting).not.toHaveBeenCalled();
  });

  it('saves the declared boolean control but rejects arbitrary checkbox names', async () => {
    const toggle = document.querySelector<HTMLInputElement>('input[data-setting="autoRefresh"]');
    if (!toggle) throw new Error('Missing autoRefresh control');
    toggle.checked = true;
    toggle.dispatchEvent(new Event('change'));
    await vi.waitFor(() =>
      expect(updateSetting).toHaveBeenCalledExactlyOnceWith('autoRefresh', true)
    );
    vi.mocked(updateSetting).mockClear();
    toggle.dataset.setting = 'fontSize';
    toggle.dispatchEvent(new Event('change'));
    await Promise.resolve();
    expect(updateSetting).not.toHaveBeenCalled();
  });
});
