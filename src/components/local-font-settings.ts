import type { MarkViewSettings } from '@core/storage';
import { getMessage } from '@utils/i18n';
import { applyLocalFonts } from '@utils/fonts';
import '@styles/local-font-settings.css';

const FONT_FIELDS = [
  ['localInterfaceFont', 'localFontInterface', 'e.g. Segoe UI'],
  ['localCodeFont', 'localFontCode', 'e.g. JetBrains Mono'],
  ['localProseFont', 'localFontProse', 'e.g. Georgia'],
] as const;

type FontKey = (typeof FONT_FIELDS)[number][0];

/** Shared controls use family names directly, without requesting access to the font list. */
export function createLocalFontSettings(
  settings: MarkViewSettings,
  save: (key: FontKey, value: string) => Promise<void>
): HTMLElement {
  const currentSettings = { ...settings };
  const section = document.createElement('fieldset');
  section.className = 'markview-local-font-settings';
  const legend = document.createElement('legend');
  legend.textContent = getMessage('localFonts');
  section.appendChild(legend);
  const help = document.createElement('p');
  help.textContent = getMessage('localFontsDescription');
  section.appendChild(help);

  for (const [key, labelKey, placeholder] of FONT_FIELDS) {
    const label = document.createElement('label');
    label.textContent = getMessage(labelKey);
    const input = document.createElement('input');
    input.type = 'text';
    input.name = key;
    input.value = settings[key] || '';
    input.placeholder = placeholder;
    input.autocomplete = 'off';
    input.spellcheck = false;
    input.addEventListener('change', async () => {
      const value = input.value.trim();
      await save(key, value);
      currentSettings[key] = value;
      input.value = value;
      applyLocalFonts(currentSettings);
    });
    label.appendChild(input);
    section.appendChild(label);
  }
  return section;
}
