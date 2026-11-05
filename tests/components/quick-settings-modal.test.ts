import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';
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

let documentListeners: MockInstance<typeof document.addEventListener>;

beforeEach(async () => {
  vi.useFakeTimers();
  document.body.innerHTML = '';
  vi.mocked(updateSetting).mockClear();
  documentListeners = vi.spyOn(document, 'addEventListener');
  await showQuickSettingsModal();
});
afterEach(() => {
  document.querySelector<HTMLButtonElement>('.markview-quick-settings-close')?.click();
  vi.advanceTimersByTime(200);
  document.body.innerHTML = '';
  vi.useRealTimers();
  vi.restoreAllMocks();
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

describe('quick-settings-modal dismissal', () => {
  it('closes on Escape but leaves native control keys alone', () => {
    const overlay = document.querySelector<HTMLElement>('.markview-quick-settings-overlay')!;
    const select = overlay.querySelector('select')!;
    for (const key of ['Tab', 'Enter']) {
      const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
      expect(select.dispatchEvent(event)).toBe(true);
      expect(event.defaultPrevented).toBe(false);
      expect(overlay.style.opacity).not.toBe('0');
    }
    const escape = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    document.dispatchEvent(escape);
    expect(escape.defaultPrevented).toBe(true);
    expect(overlay.style.opacity).toBe('0');
    expect(documentListeners.mock.calls.some(([type]) => type === 'keydown')).toBe(true);
    vi.advanceTimersByTime(200);
    expect(overlay.isConnected).toBe(false);
  });

  it('closes on a backdrop click', () => {
    const overlay = document.querySelector<HTMLElement>('.markview-quick-settings-overlay')!;
    overlay.click();
    vi.advanceTimersByTime(200);
    expect(overlay.isConnected).toBe(false);
  });
});
