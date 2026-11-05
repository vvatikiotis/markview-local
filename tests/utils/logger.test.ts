import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe('logger console adapter', () => {
  it.each(['production', 'development'])(
    'preserves the welcome banner in %s',
    async environment => {
      vi.resetModules();
      vi.stubEnv('NODE_ENV', environment);
      const log = vi.spyOn(console, 'log').mockImplementation(() => {});
      const info = vi.spyOn(console, 'info').mockImplementation(() => {});
      const debug = vi.spyOn(console, 'debug').mockImplementation(() => {});
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const error = vi.spyOn(console, 'error').mockImplementation(() => {});
      const { logger } = await import('@utils/logger');
      const detail = { value: 1 };
      logger.log('log', detail);
      logger.info('info', detail);
      logger.debug('debug', detail);
      logger.warn('warn', detail);
      logger.error('error', detail);
      for (const [spy, method] of [
        [log, 'log'],
        [info, 'info'],
        [debug, 'debug'],
        [warn, 'warn'],
        [error, 'error'],
      ] as const) {
        if (environment === 'production') expect(spy).not.toHaveBeenCalled();
        else expect(spy).toHaveBeenCalledExactlyOnceWith(method, detail);
      }
      chrome.runtime.getManifest = vi.fn().mockReturnValue({ version: '1.2.3' });
      const { showWelcomeMessage } = await import('@utils/console-welcome');
      showWelcomeMessage();
      expect(log).toHaveBeenLastCalledWith(
        '%cMarkView %cv1.2.3 %c- Modern Markdown Viewer for Chromium browsers (Chrome, Edge, Brave, Opera, etc.)',
        'color: #6366f1; font-size: 16px; font-weight: bold;',
        'color: #8b5cf6; font-size: 12px;',
        'color: #64748b; font-size: 12px;'
      );
    }
  );
});
