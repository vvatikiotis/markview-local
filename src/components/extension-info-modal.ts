/**
 * Extension Info Modal Component
 * Displays extension information, version, and original-project attribution
 * Follows MarkView brand design system
 */

import { logger } from '@utils/logger';
import { getMessage } from '@utils/i18n';
import { ORIGINAL_PROJECT } from '@utils/original-project';
import { MESSAGES } from '@utils/messages';

/**
 * Show extension info modal
 * Displays version and original-project attribution
 */
export async function showExtensionInfoModal(): Promise<void> {
  logger.log('[ExtensionInfoModal] Showing modal');

  // Get current font family setting
  const { getSettings } = await import('@core/storage');
  const { getFontFamily } = await import('@utils/fonts');
  const settings = await getSettings();
  const fontFamily = settings.fontFamily ? getFontFamily(settings.fontFamily) : 'inherit';

  // Get extension version from manifest
  const manifest = chrome.runtime.getManifest();
  const version = manifest.version;

  // Create modal overlay
  const overlay = document.createElement('div');
  overlay.className = 'markview-extension-info-overlay';

  // Create modal content container
  const modal = document.createElement('div');
  modal.className = 'markview-extension-info-modal';
  if (fontFamily !== 'inherit') {
    modal.style.fontFamily = fontFamily;
  }

  // Create modal header (fixed, no scroll)
  const modalHeader = document.createElement('div');
  modalHeader.className = 'markview-extension-info-header';
  modalHeader.innerHTML = getHeaderHTML(version);

  // Create modal body (scrollable)
  const modalBody = document.createElement('div');
  modalBody.className = 'markview-extension-info-body';
  modalBody.innerHTML = getBodyHTML();

  // Assemble modal structure
  modal.appendChild(modalHeader);
  modal.appendChild(modalBody);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  // Setup event listeners
  setupEventListeners(modalHeader, modalBody, overlay);

  logger.log('[ExtensionInfoModal] Modal displayed successfully');
}

/**
 * Generate header HTML with current language
 */
function getHeaderHTML(version: string): string {
  return `
    <button class="markview-extension-info-close" title="${MESSAGES.common.close}">
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    </button>
    
    <div class="markview-extension-info-header-content">
      <div class="markview-extension-info-logo">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z" fill="url(#logo-gradient)" stroke="url(#logo-gradient)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          <defs>
            <linearGradient id="logo-gradient" x1="3" y1="2" x2="21" y2="22" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stop-color="#667eea"/>
              <stop offset="100%" stop-color="#764ba2"/>
            </linearGradient>
          </defs>
        </svg>
      </div>
      <h1 class="markview-extension-info-title">${getMessage('appName')}</h1>
      <p class="markview-extension-info-version">Version ${version}</p>
      <p class="markview-extension-info-tagline">${MESSAGES.appDescription || 'Modern Markdown Viewer for Chrome'}</p>
    </div>
  `;
}

/**
 * Generate body HTML with current language
 */
function getBodyHTML(): string {
  return `
    <div class="markview-extension-info-content">
      <div class="markview-extension-info-attribution">
        <p>${getMessage('attribution_originalAuthor')} <strong>${ORIGINAL_PROJECT.author}</strong></p>
        <p>
          <a href="${ORIGINAL_PROJECT.repository}" target="_blank" rel="noopener noreferrer">${getMessage('attribution_repository')}</a> ·
          <a href="${ORIGINAL_PROJECT.website}" target="_blank" rel="noopener noreferrer">${getMessage('attribution_website')}</a>
        </p>
        <p>${getMessage('attribution_modifiedBuild')}</p>
      </div>
    </div>
  `;
}

/**
 * Setup event listeners for modal
 */
function setupEventListeners(
  headerElement: HTMLElement,
  bodyElement: HTMLElement,
  overlay: HTMLElement
): void {
  // Close button handler
  const closeBtn = headerElement.querySelector(
    '.markview-extension-info-close'
  ) as HTMLButtonElement;
  if (closeBtn) {
    closeBtn.addEventListener('click', () => closeModal(overlay));
  }

  // Close on background click
  overlay.addEventListener('click', e => {
    if (e.target === overlay) {
      closeModal(overlay);
    }
  });

  // Listen for language changes and update modal content
  const handleLanguageChange = async () => {
    await updateModalContent(headerElement, bodyElement, overlay);
  };
  document.addEventListener('markview:languageChanged', handleLanguageChange);
}

/**
 * Update modal content when language changes
 */
function updateModalContent(
  headerElement: HTMLElement,
  bodyElement: HTMLElement,
  overlay: HTMLElement
): void {
  // Get extension version
  const manifest = chrome.runtime.getManifest();
  const version = manifest.version;

  // Update header and body
  headerElement.innerHTML = getHeaderHTML(version);
  bodyElement.innerHTML = getBodyHTML();

  // Re-attach event listeners
  setupEventListeners(headerElement, bodyElement, overlay);

  logger.log('[ExtensionInfoModal] Modal content updated for language change');
}

/**
 * Close modal with fade-out animation
 */
function closeModal(overlay: HTMLElement): void {
  // Add fade out animation using inline styles (more reliable than CSS class)
  overlay.style.opacity = '0';
  overlay.style.transition = 'opacity 0.2s ease-out';
  setTimeout(() => {
    overlay.remove();
  }, 200);
  logger.log('[ExtensionInfoModal] Modal closed');
}
