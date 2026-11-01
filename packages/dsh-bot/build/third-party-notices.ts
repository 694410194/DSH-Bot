import { readFile, readdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';

/** Preserve the notices of implementation code actually included by esbuild. */
export async function thirdPartyNotices(inputs: readonly string[]): Promise<string> {
  const packages = new Map<string, { name: string; version: string; license: string; notices: string[] }>();
  for (const input of inputs) {
    if (!/(^|[/\\])node_modules([/\\]|$)/.test(input)) continue;
    let directory = dirname(input);
    for (;;) {
      let manifest: { name?: string; version?: string; license?: string } | undefined;
      try {
        manifest = JSON.parse(await readFile(join(directory, 'package.json'), 'utf8'));
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      }
      if (manifest?.name && manifest.version) {
        if (!packages.has(directory)) {
          const names = (await readdir(directory)).filter(name => /^(?:licen[cs]e|copying|notice)(?:[.-].*)?$/i.test(name)).sort();
          if (!names.some(name => /^(?:licen[cs]e|copying)(?:[.-].*)?$/i.test(name))) {
            throw new Error(`Bundled dependency has no license text: ${manifest.name}@${manifest.version}`);
          }
          packages.set(directory, {
            name: manifest.name,
            version: manifest.version,
            license: manifest.license ?? 'See included license text',
            notices: await Promise.all(names.map(async name => `${name}\n${(await readFile(join(directory, name), 'utf8')).trimEnd()}`)),
          });
        }
        break;
      }
      const parent = dirname(directory);
      if (parent === directory) throw new Error(`Cannot identify bundled dependency: ${input}`);
      directory = parent;
    }
  }
  const entries = [...packages.values()].sort((a, b) => `${a.name}@${a.version}`.localeCompare(`${b.name}@${b.version}`, 'en'));
  return [
    'Third-party notices for the DSH-Bot Client bundle',
    '',
    'Generated from the implementation files included by the Client build.',
    'External runtime dependencies retain their own separately distributed licenses.',
    ...entries.flatMap(entry => [
      '', '======================================================================',
      `${entry.name}@${entry.version} (${entry.license})`, '', ...entry.notices,
    ]),
    '',
  ].join('\n');
}
