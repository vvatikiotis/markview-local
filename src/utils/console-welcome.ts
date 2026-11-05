/**
 * Display welcome message in browser console
 * This is the only log that should appear in production builds
 */
import { logger } from './logger';
import { ORIGINAL_PROJECT } from './original-project';

export const showWelcomeMessage = (): void => {
  const manifest = chrome.runtime.getManifest();
  const version = manifest.version;

  logger.banner(
    `%cMarkView Local %cv${version} %c- Modern Markdown Viewer for Chromium browsers (Chrome, Edge, Brave, Opera, etc.)\nModified local build, not maintained or endorsed by the original authors.\nOriginal author: ${ORIGINAL_PROJECT.author}\nOriginal repository: ${ORIGINAL_PROJECT.repository}\nOriginal website: ${ORIGINAL_PROJECT.website}`,
    'color: #6366f1; font-size: 16px; font-weight: bold;',
    'color: #8b5cf6; font-size: 12px;',
    'color: #64748b; font-size: 12px;'
  );
};
