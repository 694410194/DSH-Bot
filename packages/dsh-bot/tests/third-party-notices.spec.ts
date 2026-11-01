import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { thirdPartyNotices } from '../build/third-party-notices.js';

describe('bundled third-party license notices', () => {
  it('preserves exact license and notice texts once per included dependency', async () => {
    const base = fileURLToPath(new URL('../../../.dsh-dev/', import.meta.url));
    await mkdir(base, { recursive: true });
    const root = await mkdtemp(join(base, 'license-notices-'));
    try {
      const dependency = join(root, 'node_modules/example');
      await mkdir(join(dependency, 'lib'), { recursive: true });
      await writeFile(join(dependency, 'package.json'), JSON.stringify({ name: 'example', version: '1.0.0', license: 'MIT' }));
      await writeFile(join(dependency, 'LICENSE'), 'Copyright Example\nFull license text.\n');
      await writeFile(join(dependency, 'NOTICE'), 'Original attribution.\n');
      const result = await thirdPartyNotices([join(dependency, 'lib/a.js'), join(dependency, 'lib/b.js'), join(root, 'src/index.ts')]);
      expect(result.match(/example@1.0.0/g)).toHaveLength(1);
      expect(result).toContain('Copyright Example\nFull license text.');
      expect(result).toContain('Original attribution.');
      expect(result).not.toContain(root);
      await rm(join(dependency, 'LICENSE'));
      await expect(thirdPartyNotices([join(dependency, 'lib/a.js')])).rejects.toThrow('no license text');
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('ships the notices generated for the actual Client implementation', async () => {
    const root = fileURLToPath(new URL('../', import.meta.url));
    const manifest = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
    expect(manifest.files).toContain('THIRD_PARTY_NOTICES.txt');
    const notices = await readFile(join(root, 'THIRD_PARTY_NOTICES.txt'), 'utf8');
    expect(notices).toContain('@deepseek-ai/schemastery@3.18.5');
    expect(notices).toContain('@deepseek-ai/cosmokit@');
    expect(notices).toContain('Permission is hereby granted');
    expect(notices).not.toContain(resolve(root));
    expect(notices).not.toContain(dirname(root));
  });
});
