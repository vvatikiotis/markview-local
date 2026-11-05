import { describe, expect, it } from 'vitest';
import { copyFile, mkdir, mkdtemp, readFile, symlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { unzipSync } from 'fflate';

const root = path.resolve(import.meta.dirname, '../..');

async function fixture(): Promise<string> {
  await mkdir(path.join(root, 'tmp'), { recursive: true });
  const directory = await mkdtemp(path.join(root, 'tmp/zip-test-'));
  await mkdir(path.join(directory, 'scripts'));
  await copyFile(path.join(root, 'scripts/zip.mjs'), path.join(directory, 'scripts/zip.mjs'));
  await writeFile(path.join(directory, 'package.json'), JSON.stringify({ version: '1.2.3' }));
  return directory;
}

function runZip(directory: string) {
  return spawnSync(process.execPath, [path.join(directory, 'scripts/zip.mjs')], {
    cwd: directory,
    env: { ...process.env, TMPDIR: path.join(root, 'tmp') },
    encoding: 'utf8',
  });
}

describe('scripts/zip.mjs', () => {
  it('packages root, nested, binary, and empty entries without a wrapper directory', async () => {
    const directory = await fixture();
    await mkdir(path.join(directory, 'extension/nested/empty'), { recursive: true });
    const manifest = Buffer.from('{"manifest_version":3}');
    const binary = Buffer.from([0, 255, 128, 13, 10]);
    const license = await readFile(path.join(root, 'LICENSE'));
    await writeFile(path.join(directory, 'extension/LICENSE'), license);
    await writeFile(path.join(directory, 'extension/manifest.json'), manifest);
    await writeFile(path.join(directory, 'extension/nested/icon.png'), binary);
    const result = runZip(directory);
    expect(result.stderr).toBe('');
    expect(result.status).toBe(0);
    const entries = unzipSync(await readFile(path.join(directory, 'dist/markview-1.2.3.zip')));
    expect(Object.keys(entries).sort()).toEqual([
      'LICENSE',
      'manifest.json',
      'nested/',
      'nested/empty/',
      'nested/icon.png',
    ]);
    expect(Buffer.from(entries['LICENSE']!)).toEqual(license);
    expect(Buffer.from(entries['manifest.json']!)).toEqual(manifest);
    expect(Buffer.from(entries['nested/icon.png']!)).toEqual(binary);
    expect(entries['nested/empty/']).toHaveLength(0);
  });

  it('fails when extension output is missing', async () => {
    const result = runZip(await fixture());
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Failed to create zip');
  });

  it('rejects symlinks rather than reading outside the extension tree', async () => {
    const directory = await fixture();
    await mkdir(path.join(directory, 'extension'));
    await symlink('../package.json', path.join(directory, 'extension/outside'));
    const result = runZip(directory);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Unsupported archive entry');
  });

  it('fails when the archive cannot be written', async () => {
    const directory = await fixture();
    await mkdir(path.join(directory, 'extension'));
    await mkdir(path.join(directory, 'dist/markview-1.2.3.zip'), { recursive: true });
    const result = runZip(directory);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Failed to create zip');
  });
});
