/** Document palettes are independent of interface mode and syntax highlighting. */
export type DocumentTheme = 'default' | 'catppuccin-pitch-black';

export const DOCUMENT_THEME_ATTRIBUTE = 'data-markview-document-theme';

export function isDocumentTheme(value: string): value is DocumentTheme {
  return value === 'default' || value === 'catppuccin-pitch-black';
}

export function applyDocumentTheme(theme: string | undefined): void {
  if (theme === 'catppuccin-pitch-black') {
    document.documentElement.setAttribute(DOCUMENT_THEME_ATTRIBUTE, theme);
  } else {
    document.documentElement.removeAttribute(DOCUMENT_THEME_ATTRIBUTE);
  }
}
