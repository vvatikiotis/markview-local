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
import { ThemeToggle } from '@components/theme-toggle';
import { updateSetting } from '@core/storage';
import { showNotification } from '@utils/notification';

afterEach(() => {
  vi.clearAllMocks();
  vi.mocked(showNotification).mockReset();
  document.body.innerHTML = '';
  document.documentElement.className = '';
});

describe('theme-toggle action Promise contract', () => {
  it('applies the theme immediately and preserves its Promise-returning action', async () => {
    const toggle = new ThemeToggle();
    await vi.waitFor(() => expect(document.getElementById('markview-theme-toggle')).not.toBeNull());
    const pending = toggle['toggleTheme']();
    expect(pending).toBeInstanceOf(Promise);
    expect(document.documentElement.classList.contains('markview-dark')).toBe(true);
    expect(updateSetting).toHaveBeenCalledWith('theme', 'dark');
    await expect(pending).resolves.toBeUndefined();
  });

  it('converts immediate action errors to rejections', async () => {
    const toggle = new ThemeToggle();
    await vi.waitFor(() => expect(document.getElementById('markview-theme-toggle')).not.toBeNull());
    const failure = new Error('notification unavailable');
    vi.mocked(showNotification).mockImplementation(() => {
      throw failure;
    });
    await expect(toggle['toggleTheme']()).rejects.toBe(failure);
  });
});
