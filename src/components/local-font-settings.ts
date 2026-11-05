import type { MarkViewSettings } from '@core/storage';
import { getMessage } from '@utils/i18n';
import { applyLocalFonts } from '@utils/fonts';
import '@styles/local-font-settings.css';

const FONT_FIELDS = [
  ['localInterfaceFont', 'localFontInterface', 'e.g. Segoe UI', 'localInterfaceFontSize'],
  ['localCodeFont', 'localFontCode', 'e.g. JetBrains Mono', 'localCodeFontSize'],
  ['localProseFont', 'localFontProse', 'e.g. Georgia', 'localProseFontSize'],
] as const;

type FontKey = (typeof FONT_FIELDS)[number][0];
type FontSizeKey = (typeof FONT_FIELDS)[number][3];

/** Shared controls use family names directly, without requesting access to the font list. */
export function createLocalFontSettings(
  settings: MarkViewSettings,
  save: (key: FontKey | FontSizeKey, value: string | number | null) => Promise<void>
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

  for (const [key, labelKey, placeholder, sizeKey] of FONT_FIELDS) {
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

    const sizeLabel = document.createElement('label');
    sizeLabel.className = 'markview-local-font-size-label';
    sizeLabel.textContent = getMessage('localFontSize');
    const sizeInput = document.createElement('input');
    sizeInput.type = 'number';
    sizeInput.name = sizeKey;
    sizeInput.min = '8';
    sizeInput.max = '48';
    sizeInput.step = '1';
    sizeInput.value = currentSettings[sizeKey]?.toString() ?? '';
    sizeInput.placeholder = getMessage('fontSizeDefault');
    sizeInput.addEventListener('change', async () => {
      const parsed = sizeInput.value === '' ? null : sizeInput.valueAsNumber;
      if (parsed !== null && (!Number.isInteger(parsed) || parsed < 8 || parsed > 48)) {
        sizeInput.value = currentSettings[sizeKey]?.toString() ?? '';
        return;
      }
      await save(sizeKey, parsed);
      currentSettings[sizeKey] = parsed;
      applyLocalFonts(currentSettings);
    });
    sizeLabel.appendChild(sizeInput);
    section.appendChild(sizeLabel);
  }
  return section;
}
