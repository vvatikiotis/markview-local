import fs from 'node:fs/promises';
import path from 'node:path';
import { zipSync } from 'fflate';

const root = path.resolve(import.meta.dirname, '..');

async function addDirectory(entries, directory, prefix = '') {
  const children = await fs.readdir(directory, { withFileTypes: true });
  for (const child of children) {
    const name = `${prefix}${child.name}`;
    const source = path.join(directory, child.name);
    if (child.isDirectory()) {
      entries[`${name}/`] = new Uint8Array();
      await addDirectory(entries, source, `${name}/`);
    } else if (child.isFile()) {
      entries[name] = await fs.readFile(source);
    } else {
      throw new Error(`Unsupported archive entry: ${source}`);
    }
  }
}

async function createZip() {
  try {
    const { version } = JSON.parse(await fs.readFile(path.join(root, 'package.json'), 'utf8'));
    const distDir = path.join(root, 'dist');
    const zipPath = path.join(distDir, `markview-${version}.zip`);
    const entries = Object.create(null);
    await addDirectory(entries, path.join(root, 'extension'));
    const bytes = zipSync(entries, { level: 9 });
    await fs.mkdir(distDir, { recursive: true });
    await fs.writeFile(zipPath, bytes);
    console.log(`✅ Created ${zipPath} (${(bytes.byteLength / 1024 / 1024).toFixed(2)} MB)`);
  } catch (error) {
    console.error('❌ Failed to create zip:', error);
    process.exitCode = 1;
  }
}

await createZip();
