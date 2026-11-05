import { describe, expect, it } from 'vitest';
import { LOCALES } from '@utils/locales';

describe('locales without keybinding help and hints', () => {
  it.each(Object.entries(LOCALES))(
    'omits shortcut help keys and stale control hints in %s',
    (_locale, messages) => {
      expect(
        Object.keys(messages).some(
          key => key.startsWith('keyboardHelp_') || key === 'actions_keyboardShortcuts'
        )
      ).toBe(false);
      for (const key of [
        'ui_scrollTopTitle',
        'toc_toggleButtonTitle',
        'theme_toggleButtonTitle',
        'centered_toggleButtonTitle',
        'sidebar_toggleButtonTitle',
      ] as const) {
        expect(messages[key].message).not.toMatch(/Ctrl|Cmd|Strg|Home|Pos1/);
        expect(messages[key].message.length).toBeGreaterThan(0);
      }
      expect(messages.ui_scrollTopTitle.message).not.toMatch(/[()]/);
      expect(messages.actions_quickSettings.message.length).toBeGreaterThan(0);
      expect(messages.actions_extensionInfo.message.length).toBeGreaterThan(0);
    }
  );
});
