import { createRequire } from 'node:module';
import { mkdir, mkdtemp, readFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import webpack, { type Configuration } from 'webpack';
import { describe, expect, it } from 'vitest';

const root = path.resolve(import.meta.dirname, '../..');
const require = createRequire(import.meta.url);

describe('webpack.common.cjs original license distribution', () => {
  it('copies the unchanged upstream LICENSE alongside the real popup and locales', async () => {
    await mkdir(path.join(root, 'tmp'), { recursive: true });
    const output = await mkdtemp(path.join(root, 'tmp/attribution-build-'));
    const common: Configuration = require('../../build/webpack.common.cjs');
    const compiler = webpack({
      ...common,
      context: root,
      mode: 'production',
      entry: {},
      output: { ...common.output, path: output },
    });
    try {
      const stats = await promisify(compiler.run.bind(compiler))();
      expect(stats?.hasErrors(), stats?.toString({ all: false, errors: true })).toBe(false);
      expect(await readFile(path.join(output, 'LICENSE'))).toEqual(
        await readFile(path.join(root, 'LICENSE'))
      );
      const popup = await readFile(path.join(output, 'popup.html'), 'utf8');
      expect(popup).toContain('MarkView Team');
      expect(popup).toContain('https://github.com/markview-app/markview');
      expect(popup).toContain('https://getmarkview.com/');
      expect(popup).toContain(
        'Modified local build; not maintained or endorsed by the original authors.'
      );
    } finally {
      await promisify(compiler.close.bind(compiler))();
    }
  }, 30000);
});
