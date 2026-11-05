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
vi.mock('@utils/keyboard-shortcuts', () => ({
  keyboardManager: { register: vi.fn(), unregister: vi.fn() },
}));
import { ThemeToggle } from '@components/theme-toggle';
import { updateSetting } from '@core/storage';
import { showNotification } from '@utils/notification';
import { keyboardManager } from '@utils/keyboard-shortcuts';

afterEach(() => {
  vi.clearAllMocks();
  vi.mocked(showNotification).mockReset();
  document.body.innerHTML = '';
  document.documentElement.className = '';
});

describe('theme-toggle action Promise contract', () => {
  it('applies the theme immediately and preserves a Promise-returning shortcut action', async () => {
    new ThemeToggle();
    await vi.waitFor(() => expect(keyboardManager.register).toHaveBeenCalled());
    const config = vi.mocked(keyboardManager.register).mock.calls[0]?.[1];
    if (!config) throw new Error('Missing theme shortcut');
    const pending = config.action(new KeyboardEvent('keydown'));
    expect(pending).toBeInstanceOf(Promise);
    expect(document.documentElement.classList.contains('markview-dark')).toBe(true);
    expect(updateSetting).toHaveBeenCalledWith('theme', 'dark');
    await expect(pending).resolves.toBeUndefined();
  });

  it('converts immediate action errors to rejections', async () => {
    new ThemeToggle();
    await vi.waitFor(() => expect(keyboardManager.register).toHaveBeenCalled());
    const config = vi.mocked(keyboardManager.register).mock.calls[0]?.[1];
    if (!config) throw new Error('Missing theme shortcut');
    const failure = new Error('notification unavailable');
    vi.mocked(showNotification).mockImplementation(() => {
      throw failure;
    });
    await expect(config.action(new KeyboardEvent('keydown'))).rejects.toBe(failure);
  });
});
