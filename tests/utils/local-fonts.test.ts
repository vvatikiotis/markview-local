import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_SETTINGS } from '@core/storage';
import { applyLocalFonts, getLocalFontFamily, loadGoogleFont } from '@utils/fonts';
import { applyLayoutSettings } from '@utils/dom';
import { createLocalFontSettings } from '@components/local-font-settings';

afterEach(() => {
  document.body.innerHTML = '';
  document.documentElement.removeAttribute('style');
});

describe('installed font overrides', () => {
  it('quotes family names so punctuation cannot become CSS declarations or font lists', () => {
    expect(getLocalFontFamily('  My Font, Serif  ', 'serif')).toBe('"My Font, Serif", serif');
    expect(getLocalFontFamily('A"B\\C\nD', 'serif')).toBe('"A\\22 B\\5c C\\a D", serif');
    expect(getLocalFontFamily('  ', 'serif')).toBe('serif');
  });

  it('applies independent prose, interface and code families, then restores defaults', () => {
    const container = document.createElement('main');
    container.id = 'markview-container';
    document.body.appendChild(container);
    applyLayoutSettings({
      fontFamily: 'default',
      localProseFont: 'Literata',
      localCodeFont: 'JetBrains Mono',
      localInterfaceFont: 'Segoe UI',
    });
    expect(container.style.fontFamily).toContain('Literata');
    expect(container.style.fontFamily).not.toContain('JetBrains');
    const root = document.documentElement.style;
    expect(root.getPropertyValue('--markview-interface-font')).toContain('Segoe UI');
    expect(root.getPropertyValue('--markview-code-font')).toContain('JetBrains Mono');
    applyLayoutSettings({
      fontFamily: 'Merriweather',
      localProseFont: '',
      localCodeFont: '',
      localInterfaceFont: '',
    });
    expect(container.style.fontFamily).toContain('Merriweather');
    expect(container.style.fontFamily).not.toContain('Literata');
    expect(root.getPropertyValue('--markview-interface-font')).toBe('');
    expect(root.getPropertyValue('--markview-code-font')).toBe('');
  });

  it('does not reset code when only the interface override is updated', () => {
    applyLocalFonts({ localCodeFont: 'Consolas' });
    applyLocalFonts({ localInterfaceFont: 'Arial' });
    expect(document.documentElement.style.getPropertyValue('--markview-code-font')).toContain(
      'Consolas'
    );
  });

  it('does not download an installed font', async () => {
    await loadGoogleFont('JetBrains Mono');
    expect(document.querySelector('link[href*="fonts.googleapis.com"]')).toBeNull();
  });

  it('loads saved values safely and saves trimmed names and cleared overrides', async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const controls = createLocalFontSettings(
      { ...DEFAULT_SETTINGS, localProseFont: '<img src=x>' },
      save
    );
    document.body.appendChild(controls);
    expect(controls.querySelector('img')).toBeNull();
    const inputs = controls.querySelectorAll('input');
    expect(inputs).toHaveLength(6);
    expect(inputs[4]!.value).toBe('<img src=x>');
    inputs[0]!.value = '  Aptos  ';
    inputs[0]!.dispatchEvent(new Event('change'));
    await vi.waitFor(() => expect(save).toHaveBeenCalledWith('localInterfaceFont', 'Aptos'));
    inputs[4]!.value = '';
    inputs[4]!.dispatchEvent(new Event('change'));
    await vi.waitFor(() => expect(save).toHaveBeenCalledWith('localProseFont', ''));
  });
});
