/**
 * i18n Utility
 * Handles internationalization for the extension with manual language selection support
 */
import { getSettings } from '@core/storage';
import { logger } from './logger';
import { LOCALES, isLocaleKey, type LocaleMessages } from './locales';

let messages: LocaleMessages = LOCALES.en;

/**
 * Initialize i18n with user settings
 * @param language Optional language override to avoid cache race conditions
 */
export async function initI18n(language?: string): Promise<void> {
  let locale: string;

  if (language !== undefined) {
    // Use provided language (from settings change event)
    locale = language;
  } else {
    // Read from settings (initial load)
    const settings = await getSettings();
    locale = settings.language;
  }

  if (locale === 'auto') {
    // Get browser language (e.g., "en-US" -> "en")
    const browserLang = navigator.language.split('-')[0];
    // Check if we support this language, otherwise default to 'en'
    if (browserLang && isLocaleKey(browserLang)) {
      locale = browserLang;
    } else {
      locale = 'en';
    }
  }

  // Ensure locale exists in LOCALES, fallback to 'en' if not
  const selectedLocale = isLocaleKey(locale) ? locale : 'en';
  messages = LOCALES[selectedLocale];
  logger.log(`[i18n] Messages loaded for locale: ${selectedLocale}`);
}

/**
 * Get a localized message
 * @param key The key of the message
 */
export function getMessage(key: string): string {
  const localized: Readonly<Record<string, { message: string }>> = messages;
  const english: Readonly<Record<string, { message: string }>> = LOCALES.en;
  if (Object.prototype.hasOwnProperty.call(localized, key)) {
    return localized[key]?.message ?? key;
  }

  // Fallback to English
  if (Object.prototype.hasOwnProperty.call(english, key)) {
    return english[key]?.message ?? key;
  }

  return key;
}

/**
 * Apply translations to elements with data-i18n attribute
 * @param container The container element to search for translatable elements
 */
export function applyTranslations(container: HTMLElement = document.body): void {
  // Handle data-i18n for text content
  const elements = container.querySelectorAll('[data-i18n]');
  elements.forEach(element => {
    const key = element.getAttribute('data-i18n');
    if (key) {
      const message = getMessage(key);
      if (message) {
        if (element.tagName === 'INPUT' && (element as HTMLInputElement).type === 'text') {
          (element as HTMLInputElement).placeholder = message;
        } else {
          element.textContent = message;
        }
      }
    }
  });

  // Handle data-i18n-attr for attributes (e.g., placeholder:key, title:key)
  const attrElements = container.querySelectorAll('[data-i18n-attr]');
  attrElements.forEach(element => {
    const attrConfig = element.getAttribute('data-i18n-attr');
    if (attrConfig) {
      // Format: "attribute:messageKey" (e.g., "placeholder:recent_search")
      const parts = attrConfig.split(':');
      if (parts.length === 2) {
        const attrName = parts[0];
        const messageKey = parts[1];
        if (attrName && messageKey) {
          const message = getMessage(messageKey);
          if (message) {
            element.setAttribute(attrName, message);
          }
        }
      }
    }
  });
}
