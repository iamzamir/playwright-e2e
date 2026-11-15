import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

require('../configs/setup.js');

const AUTH_DIR = path.resolve(__dirname, '../testdata/.auth');

function printUsage(): void {
  console.log(`
Usage: npm run codegen [-- <url>] [--auth <storage-state.json>] [--output <file>]

Launches Playwright codegen with the cached storage state so recording starts
already signed in (no B2C/MFA prompt).

  <url>       Optional. Defaults to LUMINATE_PORTAL_URL for the selected ENVIRONMENT.
  --auth      Optional. Path to a storage-state file. Defaults to the most recent
              file under testdata/.auth (searched recursively).
  --output    Optional. Write the generated spec to this path instead of stdout.

Environment is selected the same way as the test scripts:
  npm run codegen            (INTEROP)
  npm run codegen:qa         (QA)
  npm run codegen:psr        (PSR)

If no cached auth exists yet, run a test once (or 'npm run snapshot -- <url> <name> --interactive')
to populate testdata/.auth.
`);
}

function findStorageStates(dir: string): string[] {
  if (!fs.existsSync(dir)) {
    return [];
  }

  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findStorageStates(full));
    } else if (entry.isFile() && entry.name.endsWith('.json')) {
      results.push(full);
    }
  }
  return results;
}

function resolveAuthPath(argv: string[]): string {
  const authIndex = argv.indexOf('--auth');
  if (authIndex !== -1 && authIndex + 1 < argv.length) {
    return path.resolve(argv[authIndex + 1]);
  }

  // global-setup writes to testdata/.auth/<realm-slug>/<alias>.json, so search recursively.
  const candidates = findStorageStates(AUTH_DIR)
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);

  return candidates.length > 0 ? candidates[0] : '';
}

function resolveTargetUrl(argv: string[]): string {
  const positional = argv.filter(arg => !arg.startsWith('-'));
  const flagValues = new Set<string>();

  for (const flag of ['--auth', '--output']) {
    const index = argv.indexOf(flag);
    if (index !== -1 && index + 1 < argv.length) {
      flagValues.add(argv[index + 1]);
    }
  }

  const url = positional.find(arg => !flagValues.has(arg));
  return url || process.env.LUMINATE_PORTAL_URL || '';
}

function main(): void {
  const argv = process.argv.slice(2);

  if (argv.includes('--help') || argv.includes('-h')) {
    printUsage();
    return;
  }

  const url = resolveTargetUrl(argv);
  if (!url) {
    console.error('[codegen] No URL provided and LUMINATE_PORTAL_URL is not set for this environment.');
    printUsage();
    process.exit(1);
  }

  const authPath = resolveAuthPath(argv);
  const args = ['playwright', 'codegen', '--target=playwright-test'];

  if (authPath && fs.existsSync(authPath)) {
    args.push(`--load-storage=${authPath}`);
    console.log(`[codegen] Reusing storage state: ${path.relative(process.cwd(), authPath)}`);
  } else {
    console.warn('[codegen] No cached storage state found — you will need to sign in manually.');
    console.warn(`[codegen] Expected one under: ${AUTH_DIR}`);
  }

  const outputIndex = argv.indexOf('--output');
  if (outputIndex !== -1 && outputIndex + 1 < argv.length) {
    args.push(`--output=${path.resolve(argv[outputIndex + 1])}`);
  }

  args.push(url);

  console.log(`[codegen] ENVIRONMENT=${process.env.ENVIRONMENT} target=${url}`);
  console.log('[codegen] Recorded output is a starting point only — move every locator into a page object before committing.');

  const result = spawnSync('npx', args, { stdio: 'inherit', shell: process.platform === 'win32' });
  process.exit(result.status ?? 0);
}

main();
