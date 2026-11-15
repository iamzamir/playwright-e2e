import { chromium } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import { getCleanDom, getAccessibilityTree } from '../util/dom-cleaner';

/**
 * Live-page Snapshot CLI.
 *
 * Captures a token-efficient DOM + ARIA snapshot of a live page so the AI
 * agents (playwright-test-author, playwright-autopilot) can draft Page Objects
 * from a repeatable, offline artifact instead of re-inspecting the live app.
 *
 * Usage:
 *   npm run snapshot -- <url> <page-name> [options]
 *   npx ts-node scripts/save-snapshot.ts <url> <page-name> [options]
 *
 * Options:
 *   --interactive | -i   Launch headful and wait for ENTER before capturing
 *                        (use for B2C/SSO/MFA login or dynamic content).
 *   --wait <ms>          Extra settle time after networkidle.
 *   --auth <path>        Explicit storageState JSON. Defaults to the newest
 *                        file under testdata/.auth/ if present.
 *
 * Output:
 *   reports/snapshots/<page-name>.html   (cleaned DOM)
 *   reports/snapshots/<page-name>.yaml   (ARIA tree)
 */

const AUTH_DIR = path.resolve(__dirname, '../testdata/.auth');
const SNAPSHOT_DIR = path.resolve(__dirname, '../reports/snapshots');

function askQuestion(query: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(query, ans => {
    rl.close();
    resolve(ans);
  }));
}

function printUsage(): void {
  console.log(`
Usage: ts-node scripts/save-snapshot.ts <url> <page-name> [options]

Arguments:
  <url>          URL of the page to snapshot
  <page-name>    Target name for output files (e.g. "planning-catalog")

Options:
  --interactive  Launch headful and wait for ENTER in the terminal before capturing
  --wait <ms>    Wait this many milliseconds after the page settles (e.g. --wait 3000)
  --auth <path>  Path to a Playwright storageState JSON file
`);
}

function resolveAuthPath(argv: string[]): string {
  const authIndex = argv.indexOf('--auth');
  if (authIndex !== -1 && authIndex + 1 < argv.length) {
    return path.resolve(argv[authIndex + 1]);
  }

  // Fall back to the most recently written storage state under testdata/.auth.
  // global-setup writes to testdata/.auth/<realm-slug>/<alias>.json, so search recursively.
  const collect = (dir: string): string[] => {
    if (!fs.existsSync(dir)) {
      return [];
    }
    const found: string[] = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        found.push(...collect(full));
      } else if (entry.isFile() && entry.name.endsWith('.json')) {
        found.push(full);
      }
    }
    return found;
  };

  const candidates = collect(AUTH_DIR)
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  if (candidates.length > 0) {
    return candidates[0];
  }

  return '';
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  // Flags that take a value; their following token must not be treated as positional.
  const flagValues = new Set<string>();
  for (const flag of ['--wait', '--auth']) {
    const index = argv.indexOf(flag);
    if (index !== -1 && index + 1 < argv.length) {
      flagValues.add(argv[index + 1]);
    }
  }
  const positionalArgs = argv.filter(arg => !arg.startsWith('-') && !flagValues.has(arg));

  if (positionalArgs.length < 2) {
    printUsage();
    process.exit(1);
  }

  const url = positionalArgs[0];
  const pageName = positionalArgs[1];
  const isInteractive = argv.includes('--interactive') || argv.includes('-i');

  let waitMs = 0;
  const waitIndex = argv.indexOf('--wait');
  if (waitIndex !== -1 && waitIndex + 1 < argv.length) {
    waitMs = parseInt(argv[waitIndex + 1], 10) || 0;
  }

  const authPath = resolveAuthPath(argv);

  console.log('=== Save UI Snapshot ===');
  console.log(`Target URL:  ${url}`);
  console.log(`Page Name:   ${pageName}`);
  console.log(`Interactive: ${isInteractive ? 'YES (Headful)' : 'NO (Headless)'}`);
  if (waitMs > 0) console.log(`Wait Time:   ${waitMs} ms`);
  if (authPath) console.log(`Auth File:   ${authPath}`);
  console.log('========================\n');

  console.log('Launching browser...');
  const browser = await chromium.launch({
    headless: !isInteractive,
    args: ['--ignore-certificate-errors']
  });

  const contextOptions: Parameters<typeof browser.newContext>[0] = {};
  if (authPath && fs.existsSync(authPath)) {
    try {
      contextOptions.storageState = JSON.parse(fs.readFileSync(authPath, 'utf-8'));
      console.log('Loaded saved authentication state.');
    } catch (e) {
      console.warn(`Warning: Failed to load auth file from ${authPath}:`, e);
    }
  }

  const context = await browser.newContext(contextOptions);
  const page = await context.newPage();

  try {
    console.log(`Navigating to ${url}...`);
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle').catch(() => {
      console.warn('Network did not reach idle within the default budget; continuing.');
    });

    if (waitMs > 0) {
      console.log(`Waiting ${waitMs}ms to let dynamic items settle...`);
      await page.waitForTimeout(waitMs);
    }

    if (isInteractive) {
      console.log('\n--- INTERACTIVE MODE ACTIVE ---');
      console.log('A headful browser window is open. Log in (B2C/MFA), navigate, or scroll as needed.');
      await askQuestion('==> Press [ENTER] in this terminal when ready to capture the snapshot...');
    }

    console.log('Capturing DOM and ARIA snapshots...');
    const cleanDom = await getCleanDom(page);
    let ariaTree = '';
    try {
      ariaTree = await getAccessibilityTree(page);
    } catch (e) {
      console.warn('Could not capture accessibility tree:', e);
    }

    if (!fs.existsSync(SNAPSHOT_DIR)) {
      fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });
    }

    const htmlPath = path.join(SNAPSHOT_DIR, `${pageName}.html`);
    const yamlPath = path.join(SNAPSHOT_DIR, `${pageName}.yaml`);

    fs.writeFileSync(htmlPath, cleanDom, 'utf-8');
    fs.writeFileSync(yamlPath, ariaTree, 'utf-8');

    console.log('\nSuccess! Snapshots saved to:');
    console.log(`  HTML DOM:  file:///${htmlPath.replace(/\\/g, '/')}`);
    console.log(`  ARIA Tree: file:///${yamlPath.replace(/\\/g, '/')}`);
  } catch (error) {
    console.error('Error during snapshot capture:', error);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

main().catch(err => {
  console.error('Unhandled fatal error in save-snapshot:', err);
  process.exit(1);
});
