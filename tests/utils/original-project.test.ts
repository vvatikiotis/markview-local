import { readFileSync } from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ORIGINAL_PROJECT } from '@utils/original-project';
import { showWelcomeMessage } from '@utils/console-welcome';
import { logger } from '@utils/logger';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('original-project identity', () => {
  it('matches the original metadata and copyright without changing them', () => {
    const root = path.resolve(import.meta.dirname, '../..');
    const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
    const manifest = JSON.parse(readFileSync(path.join(root, 'src/manifest.json'), 'utf8'));
    const license = readFileSync(path.join(root, 'LICENSE'), 'utf8');
    expect(ORIGINAL_PROJECT.author).toBe('MarkView Team');
    expect(pkg.author).toBe(ORIGINAL_PROJECT.author);
    expect(manifest.author).toBe(ORIGINAL_PROJECT.author);
    expect(pkg.repository.url).toBe(`${ORIGINAL_PROJECT.repository}.git`);
    expect(ORIGINAL_PROJECT.website).toBe('https://getmarkview.com/');
    expect(license).toContain(`Copyright (c) 2026 ${ORIGINAL_PROJECT.author}`);
  });

  it('credits upstream in the existing production-visible welcome banner without navigating', () => {
    vi.stubGlobal('chrome', {
      ...chrome,
      runtime: { ...chrome.runtime, getManifest: () => ({ version: '1.0.0' }) },
    });
    const banner = vi.spyOn(logger, 'banner').mockImplementation(() => {});
    const open = vi.spyOn(window, 'open');
    showWelcomeMessage();
    expect(banner).toHaveBeenCalledTimes(1);
    const text = banner.mock.calls[0]![0] as string;
    expect(text).toContain('v1.0.0');
    expect(text).toContain(
      'Modified local build, not maintained or endorsed by the original authors.'
    );
    expect(text).toContain(`Original author: ${ORIGINAL_PROJECT.author}`);
    expect(text).toContain(`Original repository: ${ORIGINAL_PROJECT.repository}`);
    expect(text).toContain(`Original website: ${ORIGINAL_PROJECT.website}`);
    expect(open).not.toHaveBeenCalled();
  });
});
