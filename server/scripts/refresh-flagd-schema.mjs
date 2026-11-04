// Refreshes the vendored official flagd JSON schemas (NFR-9) from flagd.dev into test/fixtures/schema/.
// Contract tests validate every emitted sync document against these pinned local copies; never fetch at
// test time (05-testing.md §3).
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(scriptDir, '../test/fixtures/schema');
const base = 'https://flagd.dev/schema/v0';

const files = [
  ['flags.json', `${base}/flags.json`],
  ['targeting.json', `${base}/targeting.json`],
];

await mkdir(outDir, { recursive: true });
for (const [file, url] of files) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`failed to refresh ${file} from ${url}: ${response.status}`);
  }
  const json = await response.json();
  await writeFile(path.join(outDir, file), `${JSON.stringify(json, null, 2)}\n`);
  console.log(`refreshed ${file} -> ${path.join(outDir, file)}`);
}
