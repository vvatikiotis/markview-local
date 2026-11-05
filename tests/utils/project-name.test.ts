import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { LOCALES } from '@utils/locales';

const root = path.resolve(import.meta.dirname, '../..');
const read = (file: string): string => readFileSync(path.join(root, file), 'utf8');
const name = 'MarkView Local';

const documents = [
  'README.md',
  'CHANGELOG.md',
  'SECURITY.md',
  'CODE_OF_CONDUCT.md',
  'docs/ARCHITECTURE.md',
  'docs/CONTRIBUTING.md',
  'docs/DEVELOPMENT.md',
  'examples/features-demo.md',
  '.github/pull_request_template.md',
];

describe('consistent local-project naming', () => {
  it('uses the same display name in the manifest and every locale', () => {
    const manifest = JSON.parse(read('src/manifest.json'));
    const pkg = JSON.parse(read('package.json'));
    expect(pkg.name).toBe('markview-local');
    expect(manifest.name).toBe(name);
    expect(manifest.short_name).toBe(name);
    for (const messages of Object.values(LOCALES)) {
      expect(messages.appName.message).toBe(name);
    }
  });

  it.each(documents)('identifies the modified project in the title of %s', file => {
    expect(read(file).split('\n')[0]).toContain(name);
  });

  it('thanks the original authors once and lists differences before the features', () => {
    const readme = read('README.md');
    expect(readme).toContain('Kudos and thanks to **MarkView Team**');
    expect(readme.match(/MarkView Team/g)).toHaveLength(1);
    const differences = readme.indexOf('## Differences from the original open-source edition');
    expect(differences).toBeGreaterThan(0);
    expect(differences).toBeLessThan(readme.indexOf('## Features'));
    const destinations = [...readme.matchAll(/\]\(([^)]+)\)/g)].map(match => match[1]);
    expect(new Set(destinations).size).toBe(destinations.length);
  });

  it('retains the original copyright rather than renaming its author', () => {
    expect(read('LICENSE')).toContain('Copyright (c) 2026 MarkView Team');
    expect(read('LICENSE')).not.toContain(name);
  });
});
