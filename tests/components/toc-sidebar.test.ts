import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('@utils/logger', () => ({ logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn() } }));
import { TocSidebar } from '@components/toc-sidebar';
import { logger } from '@utils/logger';

beforeEach(() => {
  document.body.innerHTML = '';
});
afterEach(() => vi.restoreAllMocks());

describe('toc-sidebar initialize Promise contract', () => {
  it('executes immediately and resolves even without headings', async () => {
    const sidebar = new TocSidebar();
    const pending = sidebar.initialize();
    expect(pending).toBeInstanceOf(Promise);
    expect(logger.log).toHaveBeenCalledWith('[TocSidebar] No headings found, not showing TOC');
    await expect(pending).resolves.toBeUndefined();
    sidebar.destroy();
  });

  it('creates heading navigation immediately', async () => {
    document.body.innerHTML = '<div id="markview-container"><h1>Heading</h1></div>';
    const sidebar = new TocSidebar();
    const pending = sidebar.initialize();
    expect(document.querySelector('#markview-toc-sidebar')).not.toBeNull();
    await expect(pending).resolves.toBeUndefined();
    sidebar.destroy();
  });

  it('rejects synchronous initialization errors instead of throwing', async () => {
    const sidebar = new TocSidebar();
    const failure = new Error('DOM unavailable');
    vi.spyOn(document, 'getElementById').mockImplementation(() => {
      throw failure;
    });
    await expect(sidebar.initialize()).rejects.toBe(failure);
  });
});
